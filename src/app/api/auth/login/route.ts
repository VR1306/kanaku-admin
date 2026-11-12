import { route, HttpError } from '@/lib/bff';
import { newSession, writeSession } from '@/lib/session';
import { loginSchema } from '@/features/auth/schemas/auth';
import { isAllowedAdminEmail, verifyPassword } from '@/services/identity';

export const POST = route(
  { public: true, schema: loginSchema, rateLimit: 20 },
  async ({ body, audit }) => {
    if (!isAllowedAdminEmail(body.email)) {
      await audit('Failed sign-in', `Account · ${body.email}`, { result: 'failed' });
      throw new HttpError(401, 'Incorrect email or password', 'invalid_credentials');
    }
    const r = await verifyPassword(body.email, body.password);
    if (!r.ok) {
      await audit(
        r.reason === 'locked' ? 'Account locked' : 'Failed sign-in',
        `Account · ${body.email}`,
        { result: 'failed' },
      );
      if (r.reason === 'locked')
        throw new HttpError(
          423,
          `Too many attempts. Try again in ${Math.ceil((r.retryAfterS ?? 900) / 60)} minutes.`,
          'locked',
        );
      if (r.reason === 'expired')
        throw new HttpError(
          403,
          'Your access has expired. Contact a Super Admin.',
          'access_expired',
        );
      throw new HttpError(401, 'Incorrect email or password', 'invalid_credentials');
    }
    // First-login accounts (forced password change and/or no MFA yet) go through setup before MFA.
    const stage = r.needsSetup ? 'setup' : 'mfa';
    await writeSession(newSession(r.user, stage, body.remember));
    return { next: stage === 'setup' ? '/setup' : '/mfa/verify' };
  },
);
