import 'server-only';
import { createHmac, randomBytes } from 'node:crypto';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function base32(buf: Buffer): string {
  let bits = 0,
    value = 0,
    out = '';
  for (const b of buf) {
    value = (value << 8) | b;
    bits += 8;
    while (bits >= 5) {
      out += ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

const unbase32 = (s: string) => {
  let bits = 0,
    value = 0;
  const out: number[] = [];
  for (const c of s) {
    value = (value << 5) | ALPHABET.indexOf(c);
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
};

export const newSecret = () => base32(randomBytes(20));

function hotp(secret: string, counter: number): string {
  const msg = Buffer.alloc(8);
  msg.writeBigUInt64BE(BigInt(counter));
  const h = createHmac('sha1', unbase32(secret)).update(msg).digest();
  const o = h[h.length - 1] & 15;
  const code = ((h[o] & 127) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3];
  return String(code % 1_000_000).padStart(6, '0');
}

/** RFC 6238 TOTP, 30s step, ±1 step drift. */
export function verifyTotp(secret: string, code: string, now = Date.now()): boolean {
  const step = Math.floor(now / 30_000);
  return [-1, 0, 1].some((d) => hotp(secret, step + d) === code);
}

export const totpNow = (secret: string, now = Date.now()) => hotp(secret, Math.floor(now / 30_000));
export const otpauthUri = (secret: string, email: string) =>
  `otpauth://totp/Kanaku%20Admin:${encodeURIComponent(email)}?secret=${secret}&issuer=Kanaku%20Admin`;
