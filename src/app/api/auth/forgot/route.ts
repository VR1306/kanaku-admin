import { route } from '@/lib/bff';
import { forgotSchema } from '@/features/auth/schemas/auth';
import { sendResetCode } from '@/lib/mailer';
import { isAllowedAdminEmail, requestReset } from '@/services/identity';

// Always answers the same way so the endpoint can't be used to discover which emails exist.
export const POST = route(
  { public: true, schema: forgotSchema, rateLimit: 5 },
  async ({ body, audit }) => {
    const code = isAllowedAdminEmail(body.email) ? await requestReset(body.email) : null;
    if (code) await sendResetCode(body.email, code);
    await audit('Requested password reset', `Account · ${body.email}`);
    return {
      sent: true,
      devCode:
        process.env.DEV_ECHO_CODES === 'true' && process.env.NODE_ENV !== 'production'
          ? (code ?? undefined)
          : undefined,
    };
  },
);
