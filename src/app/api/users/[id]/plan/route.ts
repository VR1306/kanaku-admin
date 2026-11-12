import type { NextRequest } from 'next/server';
import { route, HttpError } from '@/lib/bff';
import { changePlanBody } from '@/features/users/schemas/users';
import { changePlan, getUser } from '@/services/users';

export async function POST(req: NextRequest, ctx: RouteContext<'/api/users/[id]/plan'>) {
  const { id } = await ctx.params;
  return route(
    { permission: 'users.changePlan', schema: changePlanBody, rateLimit: 20 },
    async ({ body, audit }) => {
      const u = await getUser(id);
      if (!u) throw new HttpError(404, 'User not found', 'not_found');
      if (u.plan === body.plan)
        throw new HttpError(409, 'The user is already on this plan', 'conflict');
      // Final proration is computed by the billing service; /plan-preview shows an estimate from the confirmed prices.
      const r = (await changePlan(id, body.plan))!;
      await audit('Changed user plan', `User · ${u.name} (${id})`, {
        before: r.before,
        after: {
          plan: body.plan,
          effective: body.effective,
          reason: body.reason,
          notified: body.notify,
        },
      });
      return { ...r.user, proration: null };
    },
  )(req);
}
