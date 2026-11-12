import type { NextRequest } from 'next/server';
import { route, HttpError } from '@/lib/bff';
import { couponCreate, couponPatch } from '@/features/billing/schemas/billing';
import { coupons } from '@/services/billing';

const find = async (id: string) => {
  const c = await coupons.get(id);
  if (!c) throw new HttpError(404, 'Coupon not found', 'not_found');
  return c;
};

export async function PATCH(req: NextRequest, ctx: RouteContext<'/api/coupons/[id]'>) {
  const { id } = await ctx.params;
  return route({ permission: 'coupons.write', schema: couponPatch }, async ({ body, audit }) => {
    let c = await find(id);
    if (body.archived !== undefined) {
      c = (await coupons.update(id, {
        archived: body.archived,
        ...(body.archived && { active: false }),
      }))!;
      await audit(body.archived ? 'Archived coupon' : 'Restored coupon', `Coupon · ${c.code}`);
    }
    if (body.active !== undefined) {
      const before = c.active;
      c = (await coupons.update(id, {
        active: body.active,
        ...(body.active && { archived: false }),
      }))!;
      await audit(body.active ? 'Activated coupon' : 'Deactivated coupon', `Coupon · ${c.code}`, {
        before,
        after: body.active,
      });
    }
    return c;
  })(req);
}

export async function DELETE(req: NextRequest, ctx: RouteContext<'/api/coupons/[id]'>) {
  const { id } = await ctx.params;
  return route({ permission: 'coupons.write' }, async ({ audit }) => {
    const c = await find(id);
    if (c.redeemed > 0)
      throw new HttpError(
        409,
        'Redeemed coupons can’t be deleted. Deactivate it instead.',
        'conflict',
      );
    await coupons.remove(id);
    await audit('Deleted coupon', `Coupon · ${c.code}`);
    return { deleted: true };
  })(req);
}

/** Edit a coupon. The code can't change once it has been redeemed. */
export async function PUT(req: NextRequest, ctx: RouteContext<'/api/coupons/[id]'>) {
  const { id } = await ctx.params;
  return route({ permission: 'coupons.write', schema: couponCreate }, async ({ body, audit }) => {
    let c = await find(id);
    if (c.redeemed > 0 && body.code !== c.code)
      throw new HttpError(
        409,
        'The code can’t be changed after the coupon has been redeemed',
        'conflict',
      );
    if (body.code !== c.code && (await coupons.list({ code: body.code })).length > 0)
      throw new HttpError(409, 'That coupon code already exists', 'conflict');
    const before = { ...c };
    c = (await coupons.update(id, body))!;
    await audit('Edited coupon', `Coupon · ${c.code}`, { before, after: { ...c } });
    return c;
  })(req);
}
