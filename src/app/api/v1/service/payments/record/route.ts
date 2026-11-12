import { z } from 'zod';
import { ApiFault, v1 } from '@/lib/v1';
import { col } from '@/lib/db';
import { coupons } from '@/services/billing';
import type { Payment } from '@/types/admin';

const body = z.object({
  id: z.string().min(1).max(80), // gateway payment id: makes the call idempotent
  userId: z.string().min(1).max(80),
  user: z.string().min(1).max(120),
  plan: z.string().min(1).max(60),
  amount: z.number().nonnegative(), // rupees, incl. GST
  method: z.string().max(60).default('Online'),
  status: z.enum(['paid', 'failed', 'refunded']).default('paid'),
  at: z.string().optional(),
  couponCode: z.string().max(40).optional(),
});

/** Server-to-server: the User App reports each payment so revenue, invoices and coupon usage show up in the console. */
export const POST = v1({ service: true }, async (req) => {
  const r = body.safeParse(await req.json().catch(() => null));
  if (!r.success)
    throw new ApiFault(400, 'validation', r.error.issues[0]?.message ?? 'Invalid body');
  const { id, userId, couponCode, at, ...rest } = r.data;
  const store = await col<
    Omit<Payment, 'id'> & { _id: string; userId: string; couponCode?: string }
  >('payments');
  const res = await store.updateOne(
    { _id: id },
    {
      $setOnInsert: {
        ...rest,
        userId,
        at: at ?? new Date().toISOString(),
        ...(couponCode ? { couponCode } : {}),
      },
    },
    { upsert: true },
  );
  if (res.upsertedCount && couponCode && rest.status === 'paid') {
    const c = (await coupons.list()).find((c) => c.code.toLowerCase() === couponCode.toLowerCase());
    if (c) await coupons.update(c.id, { redeemed: c.redeemed + 1 });
  }
  return { recorded: !!res.upsertedCount };
});
