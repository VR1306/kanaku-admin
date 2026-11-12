import type { NextRequest } from 'next/server';
import { v1 } from '@/lib/v1';
import * as support from '@/services/support';
import { ownedTicket, parse, present, readBody } from '@/services/support-user';

/** The user's client received / opened the agent's messages (drives the ✓ / ✓✓ status on the agent side). */
export async function POST(
  req: NextRequest,
  ctx: RouteContext<'/api/v1/service/support/tickets/[id]/read'>,
) {
  const { id } = await ctx.params;
  return v1({ service: true }, async () => {
    const b = await parse(req, readBody);
    const t = await ownedTicket(id, b.userId);
    await support.markSeen(t, 'user', b.kind);
    return present(t);
  })(req);
}
