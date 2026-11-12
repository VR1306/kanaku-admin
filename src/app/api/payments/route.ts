import { route } from '@/lib/bff';
import { paymentsQuery } from '@/features/billing/schemas/billing';
import { payments } from '@/services/billing';

export const GET = route(
  { permission: 'payments.view', schema: paymentsQuery },
  async ({ body }) => {
    const all = await payments.list({}, { at: -1 });
    const paid = all.filter((p) => p.status === 'paid');
    return {
      items: all.filter((p) => body.status === 'all' || p.status === body.status),
      counts: {
        failed: all.filter((p) => p.status === 'failed').length,
        refunded: all.filter((p) => p.status === 'refunded').length,
        payments: paid.length,
        collected: Math.round(paid.reduce((n, p) => n + p.amount, 0) * 100) / 100,
      },
    };
  },
);
