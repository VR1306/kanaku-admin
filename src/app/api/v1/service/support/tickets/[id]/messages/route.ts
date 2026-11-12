import type { NextRequest } from 'next/server';
import { ApiFault, v1 } from '@/lib/v1';
import * as support from '@/services/support';
import { messageBody, ownedTicket, parse, present } from '@/services/support-user';

export async function POST(
  req: NextRequest,
  ctx: RouteContext<'/api/v1/service/support/tickets/[id]/messages'>,
) {
  const { id } = await ctx.params;
  return v1({ service: true }, async () => {
    const b = await parse(req, messageBody);
    const t = await ownedTicket(id, b.userId);
    if (!(await support.postFromUser(t, b.message)))
      throw new ApiFault(
        409,
        'resolved',
        'This ticket is resolved, so replies are closed. If you need more help, please start a new request.',
      );
    return present(t);
  })(req);
}
