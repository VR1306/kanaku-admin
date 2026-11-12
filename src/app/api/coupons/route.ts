import { route, HttpError } from '@/lib/bff';
import { newId } from '@/lib/db';
import { couponCreate } from '@/features/billing/schemas/billing';
import { coupons } from '@/services/billing';
import type { Coupon } from '@/types/admin';

const stateOf = (c: Coupon, today: string) =>
  c.archived
    ? 'archived'
    : !c.active
      ? 'inactive'
      : c.until < today
        ? 'expired'
        : c.from > today
          ? 'scheduled'
          : 'active';

export const GET = route({ permission: 'coupons.write' }, async () => {
  const today = new Date().toISOString().slice(0, 10);
  return (await coupons.list({}, { code: 1 })).map((c) => ({ ...c, state: stateOf(c, today) }));
});

export const POST = route(
  { permission: 'coupons.write', schema: couponCreate },
  async ({ body, audit }) => {
    if ((await coupons.list({ code: body.code })).length)
      throw new HttpError(409, 'That coupon code already exists', 'conflict');
    const c = await coupons.insert({ ...body, id: newId('cp'), redeemed: 0 });
    await audit('Created coupon', `Coupon · ${c.code}`, { after: c });
    return c;
  },
);
