import { preflight, v1 } from '@/lib/v1';
import { listPlans } from '@/services/billing';
import { getPublished } from '@/services/content';

export const OPTIONS = preflight;
/** Visible, live plans with prices and the feature bullets the admin published for each. */
export const GET = v1({ cache: 'public, s-maxage=30, stale-while-revalidate=120' }, async () => {
  const [plans, cms] = await Promise.all([listPlans(), getPublished()]);
  return plans
    .filter((p) => p.visible && p.status === 'live')
    .map(
      ({
        id,
        name,
        description,
        badge,
        monthly,
        yearly,
        gstPct,
        gstMode,
        version,
        modules,
        maxBudgets,
      }) => ({
        key: id.replace(/^plan_/, ''),
        id,
        name,
        description,
        badge,
        features: cms?.pricing.plans.find((r) => r.planId === id)?.bullets ?? [],
        monthly,
        yearly,
        gstPct,
        gstMode,
        version,
        modules,
        maxBudgets,
        currency: 'INR',
      }),
    );
});
