import { route, HttpError } from '@/lib/bff';
import { setPasswordSchema } from '@/features/auth/schemas/auth';
import { setPassword } from '@/services/identity';

export const POST = route(
  { stages: ['setup'], schema: setPasswordSchema, rateLimit: 10 },
  async ({ body, session, audit }) => {
    if (!(await setPassword(session!.id, body.password)))
      throw new HttpError(404, 'Account not found', 'not_found');
    await audit('Changed password (first login)', `Account · ${session!.email}`);
    return { ok: true };
  },
);
