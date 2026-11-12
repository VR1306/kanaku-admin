import { beforeAll, describe, expect, it } from 'vitest';
import { totpNow } from '@/lib/totp';
import { hasDb, useTestDb } from '@/test/db';
import {
  acceptInvite,
  getAccount,
  inviteMember,
  isSessionActive,
  mfaConfirmSetup,
  mfaSetup,
  peekInvite,
  registerSession,
  requestReset,
  resetPassword,
  revokeSession,
  verifyMfa,
  verifyPassword,
} from './identity';

const PW = 'Str0ng!Pass';
async function activeMember(name: string) {
  const { token, account } = await inviteMember({
    name,
    email: `${name.toLowerCase()}@kanaku.com`,
    role: 'analyst',
  });
  await acceptInvite(token, PW);
  const { activate } = await import('./identity');
  await activate(account.id);
  return account;
}

describe.skipIf(!hasDb)('identity', () => {
  useTestDb();
  let lockee: string;
  beforeAll(async () => {
    lockee = (await activeMember('Lockee')).email;
  });

  it('locks the account after 5 failed passwords', async () => {
    for (let i = 0; i < 4; i++)
      expect(await verifyPassword(lockee, 'wrong-pass-1')).toMatchObject({
        ok: false,
        reason: 'invalid',
      });
    expect(await verifyPassword(lockee, 'wrong-pass-1')).toMatchObject({
      ok: false,
      reason: 'locked',
    });
    expect(await verifyPassword(lockee, PW)).toMatchObject({ ok: false, reason: 'locked' });
  });
  it('accepts the right password', async () => {
    const a = await activeMember('Goodpw');
    expect(await verifyPassword(a.email, PW)).toMatchObject({ ok: true, needsSetup: true }); // MFA not enrolled yet
    expect(await verifyPassword(a.email, 'nope-nope-1')).toMatchObject({ ok: false });
  });
  it('invitation tokens are single-use', async () => {
    const { token } = await inviteMember({
      name: 'New Person',
      email: 'new.person@kanaku.com',
      role: 'analyst',
    });
    expect(await peekInvite(token)).toMatchObject({ email: 'new.person@kanaku.com' });
    expect(await acceptInvite(token, PW)).not.toBeNull();
    expect(await acceptInvite(token, 'Another!Pass1')).toBeNull();
    expect(await peekInvite(token)).toBeNull();
  });
  it('rejects duplicate team members', async () =>
    expect(inviteMember({ name: 'Dup', email: lockee, role: 'admin' })).rejects.toThrow());
  it('MFA setup issues 8 single-use backup codes', async () => {
    const { token } = await inviteMember({
      name: 'Mfa Person',
      email: 'mfa.person@kanaku.com',
      role: 'analyst',
    });
    const u = (await acceptInvite(token, PW))!;
    const s = (await mfaSetup(u.id))!;
    expect(await mfaConfirmSetup(u.id, '000000')).toBeNull();
    const codes = (await mfaConfirmSetup(u.id, totpNow(s.secret)))!;
    expect(codes).toHaveLength(8);
    expect(await verifyMfa(u.id, codes[0])).toBe('ok');
    expect(await verifyMfa(u.id, codes[0])).toBe('invalid'); // used
  });
  it('MFA locks after 5 bad attempts and the lock survives a valid code', async () => {
    const a = await activeMember('Mfalock');
    const r: string[] = [];
    for (let i = 0; i < 5; i++) r.push(await verifyMfa(a.id, '999999'));
    expect(r.at(-1)).toBe('locked');
    const s = (await mfaSetup(a.id))!;
    expect(await verifyMfa(a.id, totpNow(s.secret))).toBe('locked');
    expect((await getAccount(a.id))?.mfaLockedUntil).toBeGreaterThan(Date.now());
  });
  it('password reset code works once and revokes sessions', async () => {
    const a = await activeMember('Resetter');
    await registerSession(a.id, 'sid-1', 'test', '1.1.1.1');
    const code = (await requestReset(a.email))!;
    expect(await resetPassword(a.email, '000000', 'N3w!Passw0rd')).toBe(false);
    expect(await resetPassword(a.email, code, 'N3w!Passw0rd')).toBe(true);
    expect(await resetPassword(a.email, code, 'N3w!Passw0rd')).toBe(false);
    expect(await isSessionActive('sid-1')).toBe(false);
  });
  it('unknown email gets no code but no error', async () =>
    expect(await requestReset('nobody@kanaku.com')).toBeNull());
  it('revoked sessions are inactive', async () => {
    await registerSession('adm_x', 'sid-2', 'd', 'ip');
    expect(await isSessionActive('sid-2')).toBe(true);
    await revokeSession('sid-2');
    expect(await isSessionActive('sid-2')).toBe(false);
  });
});
