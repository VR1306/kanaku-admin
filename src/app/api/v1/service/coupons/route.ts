import { v1 } from '@/lib/v1';
import { coupons, getPlan } from '@/services/billing';
import { couponProblem, couponUsageByUser } from '@/services/coupon-rules';

/**
 * GET ?plan=pro&interval=monthly&userId= — coupons to show at checkout: the ones the admin hasn't hidden
 * ("listed" is the default) that are usable right now for this plan, and, when `userId` is given, that this customer
 * hasn't already used. Private (unlisted) coupons never appear.
 */
export const GET = v1({ service: true }, async (req) => {
  const q = req.nextUrl.searchParams;
  const planKey = q.get('plan') ?? 'pro';
  const interval = q.get('interval') === 'yearly' ? 'yearly' : 'monthly';
  const userId = q.get('userId');
  const plan = (await getPlan(planKey)) ?? (await getPlan(`plan_${planKey}`));
  if (!plan) return [];
  const [all, usage] = await Promise.all([
    coupons.list(),
    userId ? couponUsageByUser(userId) : Promise.resolve(new Map<string, number>()),
  ]);
  const base = (interval === 'yearly' ? plan.yearly : plan.monthly) ?? 0;
  return all
    .filter(
      (c) =>
        c.listed !== false && // listed unless the admin unticked "show in checkout"
        couponProblem(c, plan, userId ? (usage.get(c.code.toUpperCase()) ?? 0) : null) === null,
    )
    .map((c) => {
      const off = Math.min(base, c.type === 'percent' ? (base * c.value) / 100 : c.value);
      return {
        code: c.code,
        type: c.type,
        value: c.value,
        duration: c.duration,
        perUser: Math.max(1, c.perUser ?? 1),
        validUntil: c.until,
        label: c.type === 'percent' ? `${c.value}% off` : `₹${c.value} off`,
        discount: Math.round(off * 100) / 100,
      };
    });
});
