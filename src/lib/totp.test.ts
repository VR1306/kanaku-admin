import { describe, expect, it } from 'vitest';
import { base32, totpNow, verifyTotp } from './totp';

describe('totp', () => {
  // RFC 6238 SHA-1 test vector: secret "12345678901234567890", T=59s → 94287082 (8 digits) → last 6 = 287082
  const secret = base32(Buffer.from('12345678901234567890'));
  it('matches the RFC 6238 vector', () => expect(totpNow(secret, 59_000)).toBe('287082'));
  it('accepts ±1 step drift but not more', () => {
    const t = 1_000_000_000_000;
    expect(verifyTotp(secret, totpNow(secret, t), t + 30_000)).toBe(true);
    expect(verifyTotp(secret, totpNow(secret, t), t + 90_000)).toBe(false);
  });
});
