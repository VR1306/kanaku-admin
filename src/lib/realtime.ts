import 'server-only';
import { createHmac, timingSafeEqual } from 'node:crypto';
import { col } from '@/lib/db';

/**
 * Realtime plumbing shared by the Next app and the standalone Socket.IO service (realtime/server.ts).
 * - emitRealtime(): writes an event to the `outbox` collection; the realtime service forwards it to the rooms.
 * - tokens: short-lived HMAC-signed connection tokens (REALTIME_SECRET) minted per authenticated browser.
 * Rooms: `agents` (support staff), `admin:<id>`, `user:<id>`.
 */
export interface RealtimeToken {
  kind: 'admin' | 'user';
  id: string;
  /** Admin only: may it join the support-staff room? */
  agent?: boolean;
  exp: number;
}

const secret = () => {
  const s = process.env.REALTIME_SECRET;
  if (!s || s.length < 32) throw new Error('REALTIME_SECRET (≥ 32 chars) is not set');
  return s;
};
const sign = (body: string) => createHmac('sha256', secret()).update(body).digest('base64url');

export function mintToken(t: Omit<RealtimeToken, 'exp'>, ttlS = 300): string {
  const body = Buffer.from(JSON.stringify({ ...t, exp: Date.now() + ttlS * 1000 })).toString(
    'base64url',
  );
  return `${body}.${sign(body)}`;
}

export function verifyToken(token: string, key = secret()): RealtimeToken | null {
  const [body, sig] = token.split('.');
  if (!body || !sig) return null;
  const good = createHmac('sha256', key).update(body).digest('base64url');
  if (good.length !== sig.length || !timingSafeEqual(Buffer.from(good), Buffer.from(sig)))
    return null;
  try {
    const t = JSON.parse(Buffer.from(body, 'base64url').toString()) as RealtimeToken;
    return t.exp > Date.now() && (t.kind === 'admin' || t.kind === 'user') && t.id ? t : null;
  } catch {
    return null;
  }
}

/** Never throws: a realtime hiccup must not fail the request that caused it. */
export async function emitRealtime(rooms: string[], event: string, payload: unknown) {
  try {
    await (await col('outbox')).insertOne({ rooms, event, payload, at: new Date() });
  } catch (e) {
    console.error('[realtime] emit failed', e);
  }
}
