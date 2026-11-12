import { route, HttpError } from '@/lib/bff';
import { resetSchema } from '@/features/auth/schemas/auth';
import { resetPassword } from '@/services/identity';

export const POST = route(
  { public: true, schema: resetSchema, rateLimit: 10 },
  async ({ body, audit }) => {
    if (!(await resetPassword(body.email, body.code, body.password))) {
      await audit('Password reset failed', `Account · ${body.email}`, { result: 'failed' });
      throw new HttpError(400, 'That code is invalid or has expired', 'invalid_code');
    }
    await audit('Password reset completed', `Account · ${body.email}`);
    return { next: '/login' };
  },
);
