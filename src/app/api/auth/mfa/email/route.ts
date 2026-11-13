import { route, HttpError } from '@/lib/bff';
import { sendSignInCode } from '@/lib/mailer';
import { requestEmailOtp } from '@/services/identity';

// Email OTP fallback: 10-minute expiry, resend after 30s. Sent by e-mail; in non-production environments that opt in
// with DEV_ECHO_CODES=true the code is also echoed back for local testing.
export const POST = route({ stages: ['mfa'], rateLimit: 6 }, async ({ session, audit }) => {
  const r = await requestEmailOtp(session!.id);
  if (!r.ok)
    throw new HttpError(429, `You can request another code in ${r.retryAfterS}s`, 'too_soon');
  if (!(await sendSignInCode(session!.email, r.code!)))
    throw new HttpError(
      502,
      'We couldn’t send the email just now. Use your authenticator app or a backup code, or try again shortly.',
      'email_failed',
    );
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
