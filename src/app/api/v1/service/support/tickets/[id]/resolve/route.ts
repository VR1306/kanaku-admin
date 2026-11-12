import type { NextRequest } from 'next/server';
import { ApiFault, v1 } from '@/lib/v1';
import * as support from '@/services/support';
import { ownedTicket, parse, present, resolveBody } from '@/services/support-user';

export async function POST(
  req: NextRequest,
  ctx: RouteContext<'/api/v1/service/support/tickets/[id]/resolve'>,
) {
  const { id } = await ctx.params;
  return v1({ service: true }, async () => {
    const b = await parse(req, resolveBody);
    const t = await ownedTicket(id, b.userId);
    if (support.setStatus(t, 'resolved') === 'invalid')
      throw new ApiFault(409, 'invalid_state', `A ${t.status} conversation can't be resolved`);
    if (b.rating) t.rating = b.rating;
    await support.save(t);
    return present(t);
  })(req);
}
