import { z } from 'zod';
import { route, HttpError } from '@/lib/bff';
import { inviteSchema } from '@/features/auth/schemas/auth';
import { newSession, writeSession } from '@/lib/session';
import { acceptInvite, peekInvite } from '@/services/identity';

export const GET = route(
  { public: true, schema: z.object({ token: z.string().min(20) }), rateLimit: 30 },
  async ({ body }) => {
    const i = await peekInvite(body.token);
    if (!i)
      throw new HttpError(
        410,
        'This invitation is invalid, expired or already used.',
        'invite_invalid',
      );
    return i;
  },
);

export const POST = route(
  { public: true, schema: inviteSchema, rateLimit: 10 },
  async ({ body, audit }) => {
    const u = await acceptInvite(body.token, body.password);
    if (!u)
      throw new HttpError(
        410,
        'This invitation is invalid, expired or already used.',
        'invite_invalid',
      );
    await audit('Accepted team invitation', `Account · ${u.email}`);
    await writeSession(newSession(u, 'setup')); // password set; MFA enrolment still required
    return { next: '/setup' };
  },
);
