import 'server-only';
import { col } from '@/lib/db';
import type { Coupon, Plan } from '@/types/admin';

/**
 * One definition of "can this coupon be used right now, by this person, on this plan?", shared by validation
 * (typed code), the checkout offers list and anything else that asks. Returns the reason a customer should see, or null.
 */
export function couponProblem(
  c: Coupon | undefined,
  plan: Pick<Plan, 'id' | 'name'>,
  usedByUser: number | null,
  today = new Date().toISOString().slice(0, 10),
): string | null {
  if (!c || c.archived) return 'This coupon code is not valid';
  if (!c.active) return 'This coupon is not active';
  if (c.from && today < c.from) return 'This coupon is not active yet';
  if (c.until && today > c.until) return 'This coupon has expired';
  if (c.maxRedemptions != null && c.redeemed >= c.maxRedemptions)
    return 'This coupon has been fully redeemed';
  if (
    c.plans.length &&
    ![plan.name, plan.id].some((x) =>
      c.plans.some((cp) => cp.toLowerCase().startsWith(x.toLowerCase())),
    )
  )
    return 'This coupon does not apply to the selected plan';
  // Per-customer limit (default 1): a coupon someone has already used cannot be applied again by them.
  if (usedByUser != null && usedByUser >= Math.max(1, c.perUser ?? 1))
    return c.perUser > 1
      ? `You have already used this coupon the maximum number of times (${c.perUser})`
      : 'You have already used this coupon';
  return null;
}

/**
 * How many times each coupon has been used by this customer, from the payments the User App reported
 * (paid or later refunded: a refund doesn't give the coupon back). Keys are upper-case codes.
 */
export async function couponUsageByUser(userId: string): Promise<Map<string, number>> {
  const rows = await (
    await col('payments')
  )
    .aggregate<{ _id: string; n: number }>([
      {
        $match: {
          userId,
          couponCode: { $exists: true, $ne: '' },
          status: { $in: ['paid', 'refunded'] },
        },
      },
      { $group: { _id: { $toUpper: '$couponCode' }, n: { $sum: 1 } } },
    ])
    .toArray();
  return new Map(rows.map((r) => [r._id, r.n]));
}
