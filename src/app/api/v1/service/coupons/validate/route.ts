import { z } from 'zod';
import { ApiFault, v1 } from '@/lib/v1';
import { coupons, getPlan } from '@/services/billing';

import { couponProblem, couponUsageByUser } from '@/services/coupon-rules';

const body = z.object({
  code: z.string().trim().min(1).max(40),
  plan: z.string().min(1).max(40),
  interval: z.enum(['monthly', 'yearly']).default('monthly'),
  /** The customer applying it: enables the once-per-customer rule. */
  userId: z.string().min(1).max(80).optional(),
});

/** Server-to-server: the User App asks whether a coupon applies to a plan (and to this customer) and what it is worth. */
export const POST = v1({ service: true }, async (req) => {
  const parsed = body.safeParse(await req.json().catch(() => null));
  if (!parsed.success)
    throw new ApiFault(400, 'validation', 'Send { code, plan, interval?, userId? }');
  const { code, plan, interval, userId } = parsed.data;
  const p = (await getPlan(plan)) ?? (await getPlan(`plan_${plan}`));
  if (!p) throw new ApiFault(404, 'plan_not_found', 'Unknown plan');
  const c = (await coupons.list()).find((c) => c.code.toLowerCase() === code.toLowerCase());
  const used =
    userId && c ? ((await couponUsageByUser(userId)).get(c.code.toUpperCase()) ?? 0) : null;
  const reason = couponProblem(c, p, used);
  if (reason || !c) return { valid: false, reason };
  const base = (interval === 'yearly' ? p.yearly : p.monthly) ?? 0;
  const off = Math.min(base, c.type === 'percent' ? (base * c.value) / 100 : c.value);
  return {
    valid: true,
    code: c.code,
    type: c.type,
    value: c.value,
    duration: c.duration,
    perUser: Math.max(1, c.perUser ?? 1),
    discount: Math.round(off * 100) / 100,
    payable: Math.round((base - off) * 100) / 100,
    gstPct: p.gstPct,
    gstMode: p.gstMode,
  };
});
