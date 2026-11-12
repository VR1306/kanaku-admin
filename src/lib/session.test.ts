import { describe, expect, it } from 'vitest';
import { decode, encode, newSession } from './session';

const user = { id: 'a', name: 'A', email: 'a@kanaku.com', role: 'admin' };

describe('session cookie', () => {
  it('round-trips a valid session', () =>
    expect(decode(encode(newSession(user, 'active')))?.email).toBe('a@kanaku.com'));
  it('rejects a tampered payload', () => {
    const [b, s] = encode(newSession(user, 'active')).split('.');
    const forged = Buffer.from(
      JSON.stringify({
        ...JSON.parse(Buffer.from(b, 'base64url').toString()),
        role: 'super_admin',
      }),
    ).toString('base64url');
    expect(decode(`${forged}.${s}`)).toBeNull();
  });
  it('expires after 30 minutes idle and after 8 hours absolute', () => {
    const s = newSession(user, 'active');
    expect(decode(encode(s), s.seen + 29 * 60)).not.toBeNull();
    expect(decode(encode(s), s.seen + 31 * 60)).toBeNull();
    expect(decode(encode({ ...s, seen: s.exp }), s.exp + 1)).toBeNull();
  });
});
