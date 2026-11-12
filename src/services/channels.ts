import 'server-only';
import { createSign } from 'node:crypto';
import { mailConfigured, sendAnnouncementEmail } from '@/lib/mailer';
import { pushNotification } from '@/services/user-app';
import type { Announcement } from '@/types/announcements';
import type { AppUser } from '@/types/users';

/**
 * Delivery channel adapters. Each returns:
 *  - { ok: true }                       delivered / accepted by the provider
 *  - { skip: 'reason' }                 not applicable (no consent, no token, provider not configured) — never retried
 *  - throws                             transient failure — retried with backoff by the delivery engine
 */
export type Outcome = { ok: true } | { skip: string };
type Target = Pick<AppUser, 'id' | 'email' | 'phone' | 'notify' | 'pushTokens' | 'name'>;
export type Payload = Pick<
  Announcement,
  'id' | 'title' | 'message' | 'ctaLabel' | 'ctaHref' | 'image'
>;

/** In-app: handed to the User App, which stores it and pushes it over its own socket to the user's open tabs. */
export async function inApp(u: Target, p: Payload): Promise<Outcome> {
  if (u.notify?.inApp === false) return { skip: 'user turned in-app notifications off' };
  const r = await pushNotification({
    userId: u.id,
    kind: 'announcement',
    title: p.title,
    body: p.message,
    href: p.ctaHref || null,
    dedupeKey: `ann:${p.id}`,
    announcementId: p.id,
    image: p.image ? { alt: p.image.alt } : null, // the picture itself is fetched on demand, not copied into every notification
    ctaLabel: p.ctaLabel || undefined,
  });
  if (r === 'unconfigured') return { skip: 'SERVICE_API_KEY not configured' };
  if (r === 'no-user') return { skip: 'user not found in the User App' };
  return { ok: true };
}

export async function email(u: Target, p: Payload): Promise<Outcome> {
  if (u.notify?.email === false) return { skip: 'user turned email off' };
  if (!mailConfigured()) return { skip: 'SMTP not configured' };
  if (!u.email) return { skip: 'no email address' };
  if (!(await sendAnnouncementEmail(u.email, p))) throw new Error('SMTP send failed');
  return { ok: true };
}

// ---- Firebase Cloud Messaging (HTTP v1). Active when FIREBASE_SERVICE_ACCOUNT_JSON is set. ----
let fcmToken: { value: string; exp: number } | null = null;
const b64 = (v: unknown) => Buffer.from(JSON.stringify(v)).toString('base64url');
function serviceAccount() {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) return null;
  try {
    return JSON.parse(raw) as { client_email: string; private_key: string; project_id: string };
  } catch {
    return null;
  }
}
async function fcmAccessToken(sa: NonNullable<ReturnType<typeof serviceAccount>>) {
  if (fcmToken && fcmToken.exp > Date.now() + 60_000) return fcmToken.value;
  const now = Math.floor(Date.now() / 1000);
  const unsigned = `${b64({ alg: 'RS256', typ: 'JWT' })}.${b64({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  })}`;
  const sig = createSign('RSA-SHA256').update(unsigned).sign(sa.private_key, 'base64url');
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${unsigned}.${sig}`,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!r.ok) throw new Error(`Google OAuth ${r.status}`);
  const j = (await r.json()) as { access_token: string; expires_in: number };
  fcmToken = { value: j.access_token, exp: Date.now() + j.expires_in * 1000 };
  return fcmToken.value;
}
export async function push(u: Target, p: Payload): Promise<Outcome> {
  if (u.notify?.push === false) return { skip: 'user turned push off' };
  const sa = serviceAccount();
  if (!sa) return { skip: 'Firebase not configured' };
  if (!u.pushTokens?.length) return { skip: 'no registered device' };
  const access = await fcmAccessToken(sa);
  let delivered = 0;
  let transient: string | null = null;
  for (const token of u.pushTokens) {
    const r = await fetch(`https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${access}` },
      body: JSON.stringify({
        message: {
          token,
          notification: { title: p.title, body: p.message },
          data: { announcementId: p.id, ...(p.ctaHref ? { href: p.ctaHref } : {}) },
        },
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (r.ok) delivered++;
    else if (r.status >= 500 || r.status === 429) transient = `FCM ${r.status}`;
    // 400/404 = stale token: counted as not delivered, not retried
  }
  if (!delivered && transient) throw new Error(transient);
  return delivered ? { ok: true } : { skip: 'all device tokens were rejected (stale)' };
}

// ---- SMS (Twilio REST). Active when TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_FROM are set. ----
export async function sms(u: Target, p: Payload): Promise<Outcome> {
  // SMS is opt-in only: no consent flag means no text message.
  if (u.notify?.sms !== true) return { skip: 'no SMS consent' };
  const { TWILIO_ACCOUNT_SID: sid, TWILIO_AUTH_TOKEN: tok, TWILIO_FROM: from } = process.env;
  if (!sid || !tok || !from) return { skip: 'SMS provider not configured' };
  const to = u.phone.replace(/[^\d+]/g, '');
  if (to.replace(/\D/g, '').length < 8) return { skip: 'no valid phone number' };
  const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST',
    headers: {
      authorization: `Basic ${Buffer.from(`${sid}:${tok}`).toString('base64')}`,
      'content-type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      To: to,
      From: from,
      Body: `${p.title}: ${p.message}`.slice(0, 320),
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (r.status >= 500 || r.status === 429) throw new Error(`SMS provider ${r.status}`);
  if (!r.ok) return { skip: `SMS provider rejected the number (${r.status})` };
  return { ok: true };
}

export const ADAPTERS = { inapp: inApp, email, push, sms } as const;
export type DeliveryChannel = keyof typeof ADAPTERS;
export const toDeliveryChannels = (c: Announcement['channels']): DeliveryChannel[] => {
  const set = new Set<DeliveryChannel>();
  for (const x of c) set.add(x === 'banner' || x === 'modal' || x === 'inapp' ? 'inapp' : x);
  return [...set];
};
