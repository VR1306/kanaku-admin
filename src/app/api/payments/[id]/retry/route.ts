import type { NextRequest } from 'next/server';
import { route, HttpError } from '@/lib/bff';
import { payments } from '@/services/billing';

export async function POST(req: NextRequest, ctx: RouteContext<'/api/payments/[id]/retry'>) {
  const { id } = await ctx.params;
  return route({ permission: 'payments.refund', rateLimit: 10 }, async ({ audit }) => {
    const p = await payments.get(id);
    if (!p) throw new HttpError(404, 'Payment not found', 'not_found');
    if (p.status !== 'failed')
      throw new HttpError(409, 'Only failed payments can be retried', 'conflict');
    await audit('Retried failed payment', `Payment · ${id}`);
    return { queued: true }; // MOCK: gateway retry pending integration
  })(req);
}
