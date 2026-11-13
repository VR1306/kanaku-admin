import 'server-only';
import { ttlCache } from '@/lib/ttl';
import { createHash, randomBytes, randomInt, scryptSync, timingSafeEqual } from 'node:crypto';
import { col, newId } from '@/lib/db';
import { newSecret, verifyTotp } from '@/lib/totp';
import type { SessionUser } from '@/types/auth';

// Identity service backed by MongoDB (`admins`, `tokens`, `sessions`).
// Passwords are scrypt-hashed; invite/reset/OTP tokens and backup codes are stored hashed; tokens are single use.
// Lockout counters live on the account document so they survive restarts and work across instances.
export interface Account {
  id: string;
  name: string;
  email: string;
  role: string;
  status: 'invited' | 'active';
  pw: string;
  mustChange: boolean;
  totpSecret: string;
  mfaEnrolled: boolean;
  backup: string[];
  failed: number;
  lockedUntil: number;
  mfaFailed?: number;
  mfaLockedUntil?: number;
  otpSentAt?: number;
  phone?: string;
  avatar?: string | null;
  accessExpires?: string;
  /**
   * Time-boxed test accounts only (created by the seed script, never from the UI): skips the second step while
   * ALLOW_MFA_EXEMPT=true AND the account has a future `accessExpires` at most 8 days away. See `mfaExemptActive`.
   */
  mfaExempt?: boolean;
  lastActive?: string;
  invitedAt?: string;
}
type AccountDoc = Omit<Account, 'id'> & { _id: string };
interface TokenDoc {
  kind: 'invite' | 'reset' | 'otp';
  hash: string;
  userId: string;
  exp: Date;
  used: boolean;
}
export interface DeviceSession {
  sid: string;
  userId: string;
  device: string;
  ip: string;
  created: string;
  last: string;
}

const hash = (s: string) => createHash('sha256').update(s).digest('hex');
const hashPw = (pw: string) => {
  const salt = randomBytes(16);
  return `${salt.toString('hex')}:${scryptSync(pw, salt, 32).toString('hex')}`;
};
const checkPw = (pw: string, stored: string) => {
  const [s, h] = stored.split(':');
  return timingSafeEqual(scryptSync(pw, Buffer.from(s, 'hex'), 32), Buffer.from(h, 'hex'));
};

const admins = () => col<AccountDoc>('admins');
const tokens = () => col<TokenDoc>('tokens');
const sessions = () => col<DeviceSession>('sessions');
const toAccount = ({ _id, ...rest }: AccountDoc): Account => ({ id: _id, ...rest });
const toUser = (a: Account): SessionUser => ({
  id: a.id,
  name: a.name,
  email: a.email,
  role: a.role,
});
const MAX_FAILS = 5;
const LOCK_MS = 15 * 60_000;

export async function getAccount(id: string): Promise<Account | undefined> {
  const d = await (await admins()).findOne({ _id: id });
  return d ? toAccount(d) : undefined;
}
async function byEmail(email: string) {
  const d = await (await admins()).findOne({ email: email.toLowerCase() });
  return d ? toAccount(d) : undefined;
}
async function patch(id: string, set: Partial<Account>): Promise<Account | undefined> {
  const { id: _omit, ...fields } = set;
  void _omit;
  const d = await (
    await admins()
  ).findOneAndUpdate({ _id: id }, { $set: fields }, { returnDocument: 'after' });
  return d ? toAccount(d) : undefined;
}

const list = (v?: string) =>
  (v ?? '')
    .split(',')
    .map((x) => x.trim().toLowerCase())
    .filter(Boolean);
/** Any email is allowed unless an allow-list is configured (ADMIN_EMAIL_DOMAINS and/or ADMIN_ALLOWED_EMAILS). */
export const isAllowedAdminEmail = (email: string) => {
  const e = email.trim().toLowerCase();
  const domains = list(process.env.ADMIN_EMAIL_DOMAINS);
  const emails = list(process.env.ADMIN_ALLOWED_EMAILS);
  if (!domains.length && !emails.length) return true;
  return emails.includes(e) || domains.includes(e.split('@')[1] ?? '');
};

export type LoginResult =
  | { ok: true; user: SessionUser; needsSetup: boolean; mfaExempt?: boolean }
  | { ok: false; reason: 'invalid' | 'locked' | 'expired'; retryAfterS?: number };

const MAX_EXEMPT_MS = 8 * 86_400_000;
/** A test account may skip MFA only while explicitly allowed by the deployment AND inside a short, future access window. */
export function mfaExemptActive(a: Pick<Account, 'mfaExempt' | 'accessExpires'>, now = Date.now()) {
  if (process.env.ALLOW_MFA_EXEMPT !== 'true' || a.mfaExempt !== true || !a.accessExpires)
    return false;
  const until = new Date(a.accessExpires).getTime();
  return until > now && until - now <= MAX_EXEMPT_MS;
}

export async function verifyPassword(email: string, password: string): Promise<LoginResult> {
  const a = await byEmail(email);
  const now = Date.now();
  if (a && a.lockedUntil > now)
    return { ok: false, reason: 'locked', retryAfterS: Math.ceil((a.lockedUntil - now) / 1000) };
  if (!a || a.status !== 'active' || !a.pw || !checkPw(password, a.pw)) {
    if (a) {
      const failed = a.failed + 1;
      if (failed >= MAX_FAILS) {
        await patch(a.id, { failed: 0, lockedUntil: now + LOCK_MS });
        return { ok: false, reason: 'locked', retryAfterS: LOCK_MS / 1000 };
      }
      await patch(a.id, { failed });
    } else {
      checkPw(password, `${'0'.repeat(32)}:${'0'.repeat(64)}`); // keep timing similar for unknown accounts
    }
    return { ok: false, reason: 'invalid' };
  }
  if (a.accessExpires && new Date(a.accessExpires).getTime() < now)
    return { ok: false, reason: 'expired' };
  if (a.failed) await patch(a.id, { failed: 0 });
  const exempt = mfaExemptActive(a, now);
  return {
    ok: true,
    user: toUser(a),
    needsSetup: exempt ? false : a.mustChange || !a.mfaEnrolled,
    mfaExempt: exempt,
  };
}

// ---- tokens (single use, hashed at rest) ----
async function issue(kind: TokenDoc['kind'], userId: string, ttlMs: number, raw: string) {
  const c = await tokens();
  await c.deleteMany({ userId, kind, used: false });
  await c.insertOne({
    kind,
    hash: hash(raw),
    userId,
    exp: new Date(Date.now() + ttlMs),
    used: false,
  });
}
async function consume(
  kind: TokenDoc['kind'],
  raw: string,
  userId?: string,
): Promise<string | null> {
  const t = await (
    await tokens()
  ).findOneAndUpdate(
    { kind, hash: hash(raw), used: false, exp: { $gt: new Date() }, ...(userId && { userId }) },
    { $set: { used: true } },
  );
  return t?.userId ?? null;
}

// ---- team invitations (72h, single use) ----
export async function inviteMember(input: {
  name: string;
  email: string;
  role: string;
  accessExpires?: string;
}): Promise<{ account: Account; token: string }> {
  const email = input.email.toLowerCase();
  if (await byEmail(email)) throw new Error('A team member with this email already exists');
  const doc: AccountDoc = {
    _id: newId('adm'),
    name: input.name,
    email,
    role: input.role,
    status: 'invited',
    pw: '',
    mustChange: true,
    totpSecret: newSecret(),
    mfaEnrolled: false,
    backup: [],
    failed: 0,
    lockedUntil: 0,
    accessExpires: input.accessExpires,
    invitedAt: new Date().toISOString(),
  };
  await (await admins()).insertOne(doc);
  const account = toAccount(doc);
  return { account, token: await resendInvite(account) };
}
export async function resendInvite(a: Account): Promise<string> {
  const raw = randomBytes(24).toString('hex');
  await issue('invite', a.id, 72 * 3600_000, raw);
  await patch(a.id, { invitedAt: new Date().toISOString() });
  return raw;
}
export async function peekInvite(raw: string): Promise<{ name: string; email: string } | null> {
  const t = await (
    await tokens()
  ).findOne({ kind: 'invite', hash: hash(raw), used: false, exp: { $gt: new Date() } });
  const a = t && (await getAccount(t.userId));
  return a ? { name: a.name, email: a.email } : null;
}
export async function acceptInvite(raw: string, password: string): Promise<SessionUser | null> {
  const uid = await consume('invite', raw);
  const a = uid ? await patch(uid, { pw: hashPw(password), mustChange: false }) : undefined;
  return a ? toUser(a) : null;
}

// ---- password recovery (6-digit code, 15 min) ----
export async function requestReset(email: string): Promise<string | null> {
  const a = await byEmail(email);
  if (!a || a.status !== 'active') return null; // caller responds identically either way
  const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
  await issue('reset', a.id, 15 * 60_000, `${a.id}:${code}`);
  return code;
}
export async function resetPassword(
  email: string,
  code: string,
  password: string,
): Promise<boolean> {
  const a = await byEmail(email);
  if (!a || !(await consume('reset', `${a.id}:${code}`, a.id))) return false;
  await patch(a.id, { pw: hashPw(password), failed: 0, lockedUntil: 0 });
  await revokeAll(a.id);
  return true;
}

// ---- MFA ----
export async function mfaSetup(userId: string): Promise<{ secret: string; email: string } | null> {
  const a = await getAccount(userId);
  return a ? { secret: a.totpSecret, email: a.email } : null;
}
export async function mfaConfirmSetup(userId: string, code: string): Promise<string[] | null> {
  const a = await getAccount(userId);
  if (!a || !verifyTotp(a.totpSecret, code)) return null;
  const plain = Array.from({ length: 8 }, () => randomBytes(4).toString('hex'));
  await patch(userId, { mfaEnrolled: true, backup: plain.map(hash) }); // plaintext shown once, never stored
  return plain;
}
export async function requestEmailOtp(
  userId: string,
): Promise<{ ok: boolean; code?: string; retryAfterS?: number }> {
  const a = await getAccount(userId);
  const last = a?.otpSentAt ?? 0;
  if (Date.now() - last < 30_000)
    return { ok: false, retryAfterS: Math.ceil((30_000 - (Date.now() - last)) / 1000) };
  const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
  await issue('otp', userId, 10 * 60_000, `${userId}:${code}`);
  await patch(userId, { otpSentAt: Date.now() });
  return { ok: true, code };
}
export async function verifyMfa(
  userId: string,
  code: string,
): Promise<'ok' | 'invalid' | 'locked'> {
  const a = await getAccount(userId);
  if (!a) return 'invalid';
  if ((a.mfaLockedUntil ?? 0) > Date.now()) return 'locked';
  const clean = code.trim();
  let ok =
    verifyTotp(a.totpSecret, clean) ||
    (await consume('otp', `${userId}:${clean}`, userId)) !== null;
  if (!ok && a.backup.includes(hash(clean))) {
    await patch(userId, { backup: a.backup.filter((h) => h !== hash(clean)) });
    ok = true;
  }
  if (ok) {
    if (a.mfaFailed) await patch(userId, { mfaFailed: 0 });
    return 'ok';
  }
  const n = (a.mfaFailed ?? 0) + 1;
  if (n >= MAX_FAILS) {
    await patch(userId, { mfaFailed: 0, mfaLockedUntil: Date.now() + LOCK_MS });
    return 'locked';
  }
  await patch(userId, { mfaFailed: n });
  return 'invalid';
}
export async function attemptsLeft(userId: string) {
  return MAX_FAILS - ((await getAccount(userId))?.mfaFailed ?? 0);
}

// ---- device sessions ----
export async function registerSession(userId: string, sid: string, device: string, ip: string) {
  const now = new Date().toISOString();
  await (await sessions()).insertOne({ sid, userId, device, ip, created: now, last: now });
}
// A valid device session is remembered for 10 s so it isn't looked up on every request. Revoking or signing out clears
// it immediately on this instance (other instances notice within 10 s).
const activeSessions = ttlCache<true>(10_000);
const lastTouched = ttlCache<true>(60_000, 2000);
export async function isSessionActive(sid: string) {
  if (activeSessions.get(sid)) return true;
  const ok = (await (await sessions()).countDocuments({ sid }, { limit: 1 })) > 0;
  if (ok) activeSessions.set(sid, true);
  return ok;
}
/** "Last active" shown in the device list only needs minute precision: at most one write a minute per device. */
export async function touchDevice(sid: string) {
  if (lastTouched.get(sid)) return;
  lastTouched.set(sid, true);
  await (await sessions()).updateOne({ sid }, { $set: { last: new Date().toISOString() } });
}
export async function listSessions(userId: string): Promise<DeviceSession[]> {
  return (await sessions())
    .find({ userId }, { projection: { _id: 0 } })
    .sort({ last: -1 })
    .toArray();
}
/** Which of these members have at least one live device session (one query instead of one per member). */
export async function listOnlineMemberIds(ids: string[]): Promise<Set<string>> {
  if (!ids.length) return new Set();
  const rows = await (await sessions()).distinct('userId', { userId: { $in: ids } });
  return new Set(rows as string[]);
}
export async function revokeSession(sid: string) {
  activeSessions.delete(sid);
  return (await (await sessions()).deleteOne({ sid })).deletedCount === 1;
}
export async function revokeAll(userId: string, exceptSid?: string) {
  activeSessions.clear(); // simplest safe invalidation: revocations are rare
  await (await sessions()).deleteMany({ userId, ...(exceptSid && { sid: { $ne: exceptSid } }) });
}

// ---- team management ----
export async function listMembers(): Promise<Account[]> {
  return (await (await admins()).find().sort({ name: 1 }).toArray()).map(toAccount);
}
export const changeRole = (id: string, role: string) => patch(id, { role });
export async function resetMemberMfa(id: string) {
  const a = await patch(id, { mfaEnrolled: false, totpSecret: newSecret(), backup: [] });
  if (a) await revokeAll(id);
  return a;
}
export async function removeMember(id: string) {
  await revokeAll(id);
  return (await (await admins()).deleteOne({ _id: id })).deletedCount === 1;
}
export async function membersWithRole(role: string) {
  return (await admins()).countDocuments({ role });
}

export async function setPassword(userId: string, password: string): Promise<boolean> {
  return !!(await patch(userId, { pw: hashPw(password), mustChange: false }));
}
export async function setTemporaryPasswordReset(userId: string) {
  await patch(userId, { mustChange: true });
  await revokeAll(userId);
}
export async function needsMfaSetup(userId: string) {
  return !(await getAccount(userId))?.mfaEnrolled;
}
export async function mustChangePassword(userId: string) {
  return !!(await getAccount(userId))?.mustChange;
}

/** Invited → Active once password AND MFA are both set. */
export async function activate(userId: string) {
  await (
    await admins()
  ).updateOne(
    { _id: userId, status: 'invited' },
    { $set: { status: 'active', lastActive: new Date().toISOString() } },
  );
}
export async function touchActive(userId: string) {
  await (
    await admins()
  ).updateOne({ _id: userId }, { $set: { lastActive: new Date().toISOString() } });
}

// ---- own profile ----
export async function updateProfile(userId: string, p: { name: string; phone?: string }) {
  const before = await getAccount(userId);
  if (!before) return null;
  const a = await patch(userId, { name: p.name, phone: p.phone ?? '' });
  return a ? { a, before: { name: before.name, phone: before.phone ?? '' } } : null;
}
export async function setAvatar(userId: string, dataUrl: string | null) {
  return !!(await patch(userId, { avatar: dataUrl }));
}
/** Verifies the current password, sets the new one and signs out every other device. */
export async function changePassword(
  userId: string,
  current: string,
  next: string,
  keepSid: string,
): Promise<'ok' | 'wrong' | 'missing'> {
  const a = await getAccount(userId);
  if (!a) return 'missing';
  if (!a.pw || !checkPw(current, a.pw)) return 'wrong';
  await patch(userId, { pw: hashPw(next) });
  await revokeAll(userId, keepSid);
  return 'ok';
}
