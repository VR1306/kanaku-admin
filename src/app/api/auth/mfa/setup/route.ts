import QRCode from 'qrcode';
import { route, HttpError } from '@/lib/bff';
import { confirmMfaSchema } from '@/features/auth/schemas/auth';
import { otpauthUri } from '@/lib/totp';
import { mfaConfirmSetup, mfaSetup } from '@/services/identity';

export const GET = route({ stages: ['setup'] }, async ({ session }) => {
  const s = await mfaSetup(session!.id);
  if (!s) throw new HttpError(404, 'Account not found', 'not_found');
  return {
    secret: s.secret,
    qr: await QRCode.toDataURL(otpauthUri(s.secret, s.email), {
      margin: 4,
      width: 320,
      errorCorrectionLevel: 'M',
      color: { dark: '#000000', light: '#ffffff' },
    }),
  };
});

export const POST = route(
  { stages: ['setup'], schema: confirmMfaSchema, rateLimit: 10 },
  async ({ body, session, audit }) => {
    const codes = await mfaConfirmSetup(session!.id, body.code);
    if (!codes) throw new HttpError(401, 'That code is incorrect', 'invalid_code');
    await audit('MFA enrolled', `Account · ${session!.email}`);
    return { backupCodes: codes }; // shown once; only hashes are stored
  },
);
