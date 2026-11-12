import 'server-only';
import { defaultMaxBudgetsFor, defaultModulesFor } from '@/constants/user-modules';
import { col, repo } from '@/lib/db';
import type { Coupon, Payment, Plan } from '@/types/admin';
import { GST_PCT, PRO_MONTHLY, yearlyFromMonthly } from '@/utils/pricing';

// Plans, coupons and payments (MongoDB `plans`, `coupons`, `payments`). Payment amounts are what was actually
// charged (incl. GST) and keep their value if a plan price is edited later, like real invoices.
export const plans = repo<Plan>('plans');
export const coupons = repo<Coupon>('coupons');
export const payments = repo<Payment & { userId?: string; couponCode?: string }>('payments');

/** Subscriber counts are derived from the user directory: Starter = free users, Pro = any paid plan. */
export async function listPlans(): Promise<Plan[]> {
  const [all, groups] = await Promise.all([
    plans.list(),
    (await col<{ _id: string }>('app_users'))
      .aggregate<{ _id: string; n: number }>([{ $group: { _id: '$plan', n: { $sum: 1 } } }])
      .toArray(),
  ]);
  const n = (k: string) => groups.find((g) => g._id === k)?.n ?? 0;
  const subs = (p: Plan) =>
    p.id === 'plan_starter'
      ? n('starter')
      : p.id === 'plan_pro'
        ? n('pro_monthly') + n('pro_yearly')
        : 0;
  return all.map((p) => ({
    ...p,
    subscribers: subs(p),
    modules: p.modules ?? defaultModulesFor(p.id),
    maxBudgets: p.maxBudgets === undefined ? defaultMaxBudgetsFor(p.id) : p.maxBudgets,
  }));
}
export async function getPlan(id: string) {
  return (await listPlans()).find((p) => p.id === id);
}

/** Current live Pro prices (listed, before GST) — used by pricing displays and proration. */
export async function proPrices() {
  const p = await plans.get('plan_pro');
  return {
    monthly: p?.monthly ?? PRO_MONTHLY,
    yearly: p?.yearly ?? yearlyFromMonthly(PRO_MONTHLY),
    gstPct: p?.gstPct ?? GST_PCT,
    gstMode: p?.gstMode ?? ('exclusive' as const),
  };
}
