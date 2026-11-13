import { afterEach, describe, expect, it, vi } from 'vitest';
import { col } from '@/lib/db';
import { hasDb, useTestDb } from '@/test/db';
import { acceptInvite, activate, inviteMember, mfaExemptActive, verifyPassword } from './identity';

vi.mock('server-only', () => ({}));
const PW = 'Admin@1234';
const inDays = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString();

describe('mfaExemptActive (pure rule)', () => {
  afterEach(() => vi.unstubAllEnvs());
  it('needs the deployment switch, the flag, and a future access window of at most 8 days', () => {
    const acct = { mfaExempt: true, accessExpires: inDays(2) };
    expect(mfaExemptActive(acct)).toBe(false); // ALLOW_MFA_EXEMPT not set
    vi.stubEnv('ALLOW_MFA_EXEMPT', 'true');
    expect(mfaExemptActive(acct)).toBe(true);
    expect(mfaExemptActive({ mfaExempt: false, accessExpires: inDays(2) })).toBe(false); // not flagged
    expect(mfaExemptActive({ mfaExempt: true })).toBe(false); // no expiry = never exempt (no permanent bypass)
    expect(mfaExemptActive({ mfaExempt: true, accessExpires: inDays(-1) })).toBe(false); // expired
    expect(mfaExemptActive({ mfaExempt: true, accessExpires: inDays(30) })).toBe(false); // window too long
    vi.stubEnv('ALLOW_MFA_EXEMPT', 'yes');
    expect(mfaExemptActive(acct)).toBe(false); // only the exact string "true" counts
  });
});

describe.skipIf(!hasDb)('sign-in for a flagged test account', () => {
  useTestDb();
  afterEach(() => vi.unstubAllEnvs());
  async function testAccount(email: string, over: Record<string, unknown>) {
    const { token, account } = await inviteMember({ name: 'Test', email, role: 'super_admin' });
    await acceptInvite(token, PW);
    await activate(account.id);
    await (
      await col('admins')
    ).updateOne(
      { _id: account.id as never },
      { $set: { mustChange: false, mfaEnrolled: false, ...over } },
    );
    return email;
  }
  it('signs straight in (no MFA, no setup) only when the switch is on and the window is open', async () => {
    const email = await testAccount('t1@example.com', {
      mfaExempt: true,
      accessExpires: inDays(2),
    });
    let r = await verifyPassword(email, PW);
    expect(r).toMatchObject({ ok: true, needsSetup: true }); // switch off: normal MFA enrolment
    expect((r as { mfaExempt?: boolean }).mfaExempt).toBe(false);
    vi.stubEnv('ALLOW_MFA_EXEMPT', 'true');
    r = await verifyPassword(email, PW);
    expect(r).toMatchObject({ ok: true, needsSetup: false, mfaExempt: true });
  });
  it('an expired test account cannot sign in at all', async () => {
    vi.stubEnv('ALLOW_MFA_EXEMPT', 'true');
    const email = await testAccount('t2@example.com', {
      mfaExempt: true,
      accessExpires: inDays(-1),
    });
    expect(await verifyPassword(email, PW)).toMatchObject({ ok: false, reason: 'expired' });
  });
  it('a normal admin is never exempt, even with the switch on', async () => {
    vi.stubEnv('ALLOW_MFA_EXEMPT', 'true');
    const email = await testAccount('t3@example.com', {});
    expect(await verifyPassword(email, PW)).toMatchObject({
      ok: true,
      needsSetup: true,
      mfaExempt: false,
    });
  });
});
