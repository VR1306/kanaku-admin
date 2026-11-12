import { route, HttpError } from '@/lib/bff';
import { revalidateLanding } from '@/services/landing-revalidate';
import { newId } from '@/lib/db';
import { planCreate } from '@/features/billing/schemas/billing';
import { listPlans, plans } from '@/services/billing';

export const GET = route({ permission: 'payments.view' }, async () => listPlans());

export const POST = route(
  { permission: 'plans.write', schema: planCreate, rateLimit: 20 },
  async ({ body, audit }) => {
    if ((await plans.list()).some((p) => p.name.toLowerCase() === body.name.toLowerCase()))
      throw new HttpError(409, 'A plan with this name already exists', 'conflict');
    const p = await plans.insert({
      id: newId('plan'),
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
      subscribers: 0,
      version: 1,
      status: 'live' as const,
    });
    revalidateLanding();
    await audit('Created plan', `Plan · ${p.name}`, { after: p });
    return p;
  },
);
