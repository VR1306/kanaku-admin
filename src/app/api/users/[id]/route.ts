import type { NextRequest } from 'next/server';
import { route, HttpError } from '@/lib/bff';
import { editUserBody } from '@/features/users/schemas/users';
import { detail, updateUser } from '@/services/users';

export async function GET(req: NextRequest, ctx: RouteContext<'/api/users/[id]'>) {
  const { id } = await ctx.params;
  return route({ permission: 'users.view' }, async ({ audit }) => {
    const d = await detail(id);
    if (!d) throw new HttpError(404, 'User not found', 'not_found');
    await audit('Viewed user details', `User · ${d.name} (${id})`);
    return d;
  })(req);
}

/** Edit a user's name and phone. The email is the sign-in identity and is not editable here. */
export async function PUT(req: NextRequest, ctx: RouteContext<'/api/users/[id]'>) {
  const { id } = await ctx.params;
  return route(
    { permission: 'users.write', schema: editUserBody, rateLimit: 30 },
    async ({ body, audit }) => {
      const r = await updateUser(id, body);
      if (!r) throw new HttpError(404, 'User not found', 'not_found');
      await audit('Edited user', `User · ${r.user.name} (${id})`, {
        before: r.before,
        after: body,
      });
      return r.user;
    },
  )(req);
}
