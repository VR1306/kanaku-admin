import type { NextRequest } from 'next/server';
import { ApiFault, v1 } from '@/lib/v1';
import { listOnlineMemberIds } from '@/services/identity';
import { ownedTicket, present } from '@/services/support-user';

export async function GET(
  req: NextRequest,
  ctx: RouteContext<'/api/v1/service/support/tickets/[id]'>,
) {
  const { id } = await ctx.params;
  return v1({ service: true }, async () => {
    const userId = req.nextUrl.searchParams.get('userId');
    if (!userId) throw new ApiFault(400, 'validation', 'userId is required');
    const t = await ownedTicket(id, userId);
    const view = present(t);
    // Is the assigned agent signed in to the console right now? (one cheap query, detail view only)
    if (t.assignee && view.agent)
      view.agent.online = (await listOnlineMemberIds([t.assignee])).has(t.assignee);
    return view;
  })(req);
}
