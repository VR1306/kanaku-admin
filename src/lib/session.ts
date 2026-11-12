import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { connection } from 'next/server';
import { randomUUID } from 'node:crypto';
import { isSessionActive } from '@/services/identity';
import type { SessionPayload, SessionUser } from '@/types/auth';

export const COOKIE = 'kanaku_admin_session';
const ABSOLUTE_S = 8 * 60 * 60;
export const IDLE_S = 30 * 60;

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new Error('SESSION_SECRET must be set (>= 32 chars)');
  return s;
}

const sign = (body: string) => createHmac('sha256', secret()).update(body).digest('base64url');

export function encode(p: SessionPayload): string {
  const body = Buffer.from(JSON.stringify(p)).toString('base64url');
  return `${body}.${sign(body)}`;
}

export function decode(
  token: string | undefined,
  now = Math.floor(Date.now() / 1000),
): SessionPayload | null {
  if (!token) return null;
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  const expected = Buffer.from(sign(body));
  const given = Buffer.from(sig);
  if (expected.length !== given.length || !timingSafeEqual(expected, given)) return null;
  try {
    const p = JSON.parse(Buffer.from(body, 'base64url').toString()) as SessionPayload;
    if (p.exp <= now || now - p.seen > IDLE_S) return null;
    return p;
  } catch {
    return null;
  }
}

export function newSession(
  user: SessionUser,
  stage: SessionPayload['stage'],
  rem?: boolean,
): SessionPayload {
  const now = Math.floor(Date.now() / 1000);
  return { ...user, stage, rem, sid: randomUUID(), iat: now, exp: now + ABSOLUTE_S, seen: now };
}

export async function writeSession(p: SessionPayload) {
  const jar = await cookies();
  jar.set(COOKIE, encode(p), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    ...(p.rem ? { maxAge: Math.max(1, p.exp - Math.floor(Date.now() / 1000)) } : {}),
  });
}

export async function clearSession() {
  (await cookies()).delete(COOKIE);
}

export async function readSession(): Promise<SessionPayload | null> {
  await connection(); // request-time only: expiry checks below read the clock
  const p = decode((await cookies()).get(COOKIE)?.value);
  // A revoked device session stops working immediately, even though the cookie is still validly signed.
  if (p?.stage === 'active' && !(await isSessionActive(p.sid))) return null;
  return p;
}

/** Sliding idle window: refresh `seen` on each authenticated request. */
export async function touchSession(p: SessionPayload) {
  await writeSession({ ...p, seen: Math.floor(Date.now() / 1000) });
}
