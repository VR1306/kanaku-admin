import type { NextRequest } from 'next/server';
import { revalidateLanding } from '@/services/landing-revalidate';
import { route, HttpError } from '@/lib/bff';
import { planAction, planDelete, planUpdate } from '@/features/billing/schemas/billing';
import { newId } from '@/lib/db';
import { getPlan, listPlans, plans } from '@/services/billing';

const find = async (id: string) => {
  const p = await getPlan(id);
  if (!p) throw new HttpError(404, 'Plan not found', 'not_found');
  return p;
};

/** Saving creates a new plan version; existing invoices keep their old price. */
export async function PUT(req: NextRequest, ctx: RouteContext<'/api/plans/[id]'>) {
  const { id } = await ctx.params;
  return route({ permission: 'plans.write', schema: planUpdate }, async ({ body, audit }) => {
    const p = await find(id);
    if (body.applyToExisting && p.subscribers > 0 && !body.confirmExisting) {
      throw new HttpError(
        409,
        `This will change pricing for ${p.subscribers.toLocaleString('en-IN')} existing subscribers. Confirm to continue.`,
        'needs_confirmation',
      );
    }
    const before = { ...p };
    const next = (await plans.update(id, {
      name: body.name,
      description: body.description,
      badge: body.badge,
      visible: body.visible,
      monthly: body.monthly,
      yearly: body.yearly,
      gstPct: body.gstPct,
      gstMode: body.gstMode,
      ...(body.modules ? { modules: body.modules } : {}),
      ...(body.maxBudgets !== undefined ? { maxBudgets: body.maxBudgets } : {}),
      version: p.version + 1,
    }))!;
    revalidateLanding();
    await audit('Updated plan (new version)', `Plan · ${next.name} v${next.version}`, {
      before,
      after: { ...next, appliedToExisting: body.applyToExisting },
    });
    return { ...next, subscribers: p.subscribers };
  })(req);
}

export async function POST(req: NextRequest, ctx: RouteContext<'/api/plans/[id]'>) {
  const { id } = await ctx.params;
  return route({ permission: 'plans.write', schema: planAction }, async ({ body, audit }) => {
    const p = await find(id);
    if (body.action === 'archive') await plans.update(id, { status: 'archived' });
    else
      await plans.insert({
        ...p,
        id: newId('plan'),
        name: `${p.name} (copy)`,
        subscribers: 0,
        version: 1,
        visible: false,
      });
    revalidateLanding();
    await audit(
      body.action === 'archive' ? 'Archived plan' : 'Duplicated plan',
      `Plan · ${p.name}`,
    );
    return listPlans();
  })(req);
}

export async function DELETE(req: NextRequest, ctx: RouteContext<'/api/plans/[id]'>) {
  const { id } = await ctx.params;
  return route({ permission: 'plans.write', schema: planDelete }, async ({ body, audit }) => {
    const p = await find(id);
    if (p.subscribers > 0)
      throw new HttpError(
        409,
        'Plans with subscribers can’t be deleted. Archive it instead.',
        'conflict',
      );
    if (body.confirmName !== p.name)
      throw new HttpError(400, 'Type the plan name to confirm', 'validation');
    await plans.remove(id);
    revalidateLanding();
    await audit('Deleted plan', `Plan · ${p.name}`);
    return { deleted: true };
  })(req);
}
