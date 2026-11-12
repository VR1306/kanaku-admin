import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { route, HttpError } from '@/lib/bff';
import { proPrices } from '@/services/billing';
import { getUser } from '@/services/users';
import { estimateProration, withGst } from '@/utils/pricing';
import { PLAN_LABEL, type PlanId } from '@/types/users';

const q = z.object({
  plan: z.enum(['starter', 'pro_monthly', 'pro_yearly']),
  effective: z.enum(['now', 'renewal']).default('now'),
});

/** Estimated charge/credit for a plan change. The billing service computes the final figure when it is applied. */
export async function GET(req: NextRequest, ctx: RouteContext<'/api/users/[id]/plan-preview'>) {
  const { id } = await ctx.params;
  return route({ permission: 'users.changePlan', schema: q }, async ({ body }) => {
    const u = await getUser(id);
    if (!u) throw new HttpError(404, 'User not found', 'not_found');
    const p = await proPrices();
    const listed = (plan: PlanId) =>
      plan === 'pro_monthly' ? p.monthly : plan === 'pro_yearly' ? p.yearly : 0;
    const period = (plan: PlanId) => (plan === 'pro_yearly' ? 365 : 30);
    const renews = u.renewsOn ? new Date(u.renewsOn).getTime() : null;
    const daysLeft = renews ? Math.max(0, Math.ceil((renews - Date.now()) / 86_400_000)) : 0;
    const target = listed(body.plan);
    const base = {
      from: PLAN_LABEL[u.plan],
      to: PLAN_LABEL[body.plan],
      gstPct: p.gstPct,
      gstMode: p.gstMode,
      price: withGst(target, p.gstPct, p.gstMode),
      estimate: true,
    };
    if (body.plan === u.plan)
      return { ...base, due: null, credit: 0, note: 'The user is already on this plan.' };
    if (body.effective === 'renewal')
      return {
        ...base,
        due: null,
        credit: 0,
        note: `Takes effect at the next renewal${u.renewsOn ? ` (${u.renewsOn})` : ''}; nothing is charged today.`,
      };
    const due = estimateProration({
      fromListed: listed(u.plan),
      toListed: target,
      daysLeft,
      periodDays: period(u.plan),
      gstPct: p.gstPct,
      mode: p.gstMode,
    });
    return { ...base, due, credit: due.credit, note: null };
  })(req);
}
