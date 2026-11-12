import type { NextRequest } from 'next/server';
import { route, HttpError } from '@/lib/bff';
import { refundBody } from '@/features/billing/schemas/billing';
import { payments } from '@/services/billing';

export async function POST(req: NextRequest, ctx: RouteContext<'/api/payments/[id]/refund'>) {
  const { id } = await ctx.params;
  return route(
    { permission: 'payments.refund', schema: refundBody, rateLimit: 10 },
    async ({ body, audit }) => {
      const p = await payments.get(id);
      if (!p) throw new HttpError(404, 'Payment not found', 'not_found');
      if (p.status !== 'paid')
        throw new HttpError(409, 'Only paid payments can be refunded', 'conflict');
      if (body.type === 'partial' && body.amount! > p.amount)
        throw new HttpError(400, `Refund can’t exceed the amount paid (${p.amount})`, 'validation');
      // MOCK: real refund goes through the billing service / payment gateway (unconfirmed).
      const next = await payments.update(id, { status: 'refunded' });
      await audit('Refunded payment', `Payment · ${id}`, {
        before: 'paid',
        after: { status: 'refunded', type: body.type, amount: body.amount, reason: body.reason },
      });
      return next;
    },
  )(req);
}
