import { randomBytes } from 'node:crypto';
import type { NextRequest } from 'next/server';
import { route, HttpError } from '@/lib/bff';
import { resetPasswordBody } from '@/features/users/schemas/users';
import { getUser, markPasswordReset } from '@/services/users';

export async function POST(req: NextRequest, ctx: RouteContext<'/api/users/[id]/reset-password'>) {
  const { id } = await ctx.params;
  return route(
    { permission: 'users.resetPassword', schema: resetPasswordBody, rateLimit: 10 },
    async ({ body, audit }) => {
      const u = await getUser(id);
      if (!u) throw new HttpError(404, 'User not found', 'not_found');
      await markPasswordReset(id);
      await audit('Reset user password', `User · ${u.name} (${id})`, {
        after: {
          method: body.method,
          signOutAll: body.signOutAll,
          forceChange: body.method === 'temp',
        },
      });
      // The temporary password is never echoed back or logged; link is MOCK-delivered (30 minute single-use).
      return body.method === 'link'
        ? { method: 'link', expiresInMinutes: 30, link: `reset/${randomBytes(12).toString('hex')}` }
        : { method: 'temp', forceChange: true };
    },
  )(req);
}
