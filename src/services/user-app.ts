import 'server-only';

/** Calls into the User App's server-to-server API (`/api/integrations/admin/*`), authenticated with SERVICE_API_KEY. */
const base = () =>
  (process.env.USER_APP_URL ?? 'https://growwithkanaku-user.vercel.app').replace(/\/$/, '');

export type UserNotification = {
  userId: string;
  kind: 'announcement' | 'support' | 'offer';
  title: string;
  body: string;
  href?: string | null;
  dedupeKey: string;
  /** Announcements: id (the User App fetches the image from the admin), the image's alt text and the button label. */
  announcementId?: string;
  image?: { alt: string } | null;
  ctaLabel?: string;
};

/** 'ok' = stored, 'no-user' = the User App doesn't know that user. Throws on transient failures so callers can retry. */
export async function pushNotification(
  n: UserNotification,
): Promise<'ok' | 'no-user' | 'unconfigured'> {
  const key = process.env.SERVICE_API_KEY;
  if (!key) return 'unconfigured';
  const r = await fetch(`${base()}/api/integrations/admin/notifications`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
    body: JSON.stringify(n),
    signal: AbortSignal.timeout(10_000),
  });
  if (r.status === 404) return 'no-user';
  if (!r.ok) throw new Error(`User App responded ${r.status}`);
  return 'ok';
}

/** Ends every session of a customer in the User App (used by "sign out of all devices"). Best effort: returns false on failure. */
export async function signOutCustomerEverywhere(userId: string): Promise<boolean> {
  const key = process.env.SERVICE_API_KEY;
  if (!key) return false;
  try {
    const r = await fetch(`${base()}/api/integrations/admin/users/sign-out`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${key}` },
      body: JSON.stringify({ userId }),
      signal: AbortSignal.timeout(10_000),
    });
    return r.ok;
  } catch {
    return false;
  }
}
