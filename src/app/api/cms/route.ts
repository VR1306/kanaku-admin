import { route } from '@/lib/bff';
import { listPlans } from '@/services/billing';
import { getState, withPlanRows } from '@/services/content';
import { getExtras, withLandingDefaults } from '@/services/landing-feed';

// Pricing is joined from the plans source of truth; the CMS never stores prices.
export const GET = route({ permission: 'cms.write' }, async () => {
  const [state, plans, extras] = await Promise.all([getState(), listPlans(), getExtras()]);
  const ids = plans.map((p) => p.id);
  return {
    ...state,
    draft: withPlanRows(withLandingDefaults(state.draft, extras), ids),
    plans: plans.map(({ id, name, monthly, yearly, gstPct, gstMode, status }) => ({
      id,
      name,
      monthly,
      yearly,
      gstPct,
      gstMode,
      status,
    })),
  };
});
