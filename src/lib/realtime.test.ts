import { beforeAll, describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
beforeAll(() => {
  process.env.REALTIME_SECRET = 's'.repeat(40);
});

describe('realtime tokens', () => {
  it('round-trips and carries the identity', async () => {
    const { mintToken, verifyToken } = await import('./realtime');
    const t = verifyToken(mintToken({ kind: 'admin', id: 'adm_1', agent: true }));
    expect(t).toMatchObject({ kind: 'admin', id: 'adm_1', agent: true });
  });
  it('rejects tampering, a wrong secret and expiry', async () => {
    const { mintToken, verifyToken } = await import('./realtime');
    const good = mintToken({ kind: 'user', id: 'u1' });
    const [body, sig] = good.split('.');
    const forged = Buffer.from(
      JSON.stringify({ kind: 'admin', id: 'u1', agent: true, exp: Date.now() + 1e6 }),
    ).toString('base64url');
    expect(verifyToken(`${forged}.${sig}`)).toBeNull(); // privilege escalation by editing the payload
    expect(verifyToken(`${body}.AAAA`)).toBeNull();
    expect(verifyToken(good, 'x'.repeat(40))).toBeNull(); // signed with another secret
    expect(verifyToken(mintToken({ kind: 'user', id: 'u1' }, -1))).toBeNull(); // expired
    expect(verifyToken('garbage')).toBeNull();
  });
});
