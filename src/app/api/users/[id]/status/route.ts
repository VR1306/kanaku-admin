import type { NextRequest } from 'next/server';
import { route, HttpError } from '@/lib/bff';
import { statusChange } from '@/features/users/schemas/users';
import { can } from '@/lib/authz';
import { getUser, setUserStatus } from '@/services/users';

export async function POST(req: NextRequest, ctx: RouteContext<'/api/users/[id]/status'>) {
  const { id } = await ctx.params;
  return route({ schema: statusChange, rateLimit: 30 }, async ({ body, session, audit }) => {
    const current = await getUser(id);
    if (!current) throw new HttpError(404, 'User not found', 'not_found');
    // Suspend/reinstate needs users.suspend; disable/re-enable needs users.write. Enforced server-side per transition.
    const needed =
      body.status === 'suspended' || current.status === 'suspended'
        ? 'users.suspend'
        : 'users.write';
    if (!(await can(session!.role, needed)))
      throw new HttpError(403, 'You do not have permission to do this', 'forbidden');
    const r = await setUserStatus(id, body.status);
    if (!r || r === 'invalid')
      throw new HttpError(
        409,
        'That status change isn’t allowed from the current status',
        'conflict',
      );
    await audit(`Changed user status to ${body.status}`, `User · ${r.user.name} (${id})`, {
      before: r.before,
      after: { status: body.status, reason: body.reason, notified: body.notify },
    });
    return r.user;
  })(req);
}
