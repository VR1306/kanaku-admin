import { route, HttpError } from '@/lib/bff';
import { sendSignInCode } from '@/lib/mailer';
import { requestEmailOtp } from '@/services/identity';

// Email OTP fallback: 10-minute expiry, resend after 30s. No email provider is connected yet, so the code is only
// echoed back in non-production environments that explicitly opt in with DEV_ECHO_CODES=true.
export const POST = route({ stages: ['mfa'], rateLimit: 6 }, async ({ session, audit }) => {
  const r = await requestEmailOtp(session!.id);
  if (!r.ok)
    throw new HttpError(429, `You can request another code in ${r.retryAfterS}s`, 'too_soon');
  await sendSignInCode(session!.email, r.code!);
  await audit('Requested email OTP', `Account · ${session!.email}`);
  const [u, d] = session!.email.split('@');
  return {
    sentTo: `${u[0]}••••@${d}`,
    devCode:
      process.env.DEV_ECHO_CODES === 'true' && process.env.NODE_ENV !== 'production'
        ? r.code
        : undefined,
  };
});
