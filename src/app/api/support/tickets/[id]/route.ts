import type { NextRequest } from 'next/server';
import { route, HttpError } from '@/lib/bff';
import { patchTicket } from '@/features/support/schemas/support';
import * as support from '@/services/support';

export async function GET(req: NextRequest, ctx: RouteContext<'/api/support/tickets/[id]'>) {
  const { id } = await ctx.params;
  return route({ permission: 'support.manage' }, async ({ session }) => {
    const t = await support.get(decodeURIComponent(id));
    if (!t) throw new HttpError(404, 'Ticket not found', 'not_found');
    // Read receipt: opening the conversation marks the user's messages as read.
    if (t.messages.some((m) => m.from === 'user' && !m.readAt)) {
      t.messages.forEach((m) => {
        if (m.from === 'user' && !m.readAt) m.readAt = new Date().toISOString();
      });
      await support.save(t);
    }
    const typing = t.typing && t.typing.until > Date.now() && t.typing.who === 'user';
    void session;
    return { ...t, typing: undefined, userTyping: !!typing, sla: support.slaBreached(t) };
  })(req);
}

export async function PATCH(req: NextRequest, ctx: RouteContext<'/api/support/tickets/[id]'>) {
  const { id } = await ctx.params;
  return route({ permission: 'support.manage', schema: patchTicket }, async ({ body, audit }) => {
    const t = await support.get(decodeURIComponent(id));
    if (!t) throw new HttpError(404, 'Ticket not found', 'not_found');
    if (body.assignee !== undefined) {
      const before = t.assigneeName;
      await support.assign(t, body.assignee);
      await audit('Changed ticket assignment', `Ticket · ${t.id}`, {
        before,
        after: t.assigneeName,
      });
    }
    if (body.priority && body.priority !== t.priority) {
      const before = t.priority;
      t.priority = body.priority;
      await audit('Changed ticket priority', `Ticket · ${t.id}`, { before, after: body.priority });
    }
    if (body.status && body.status !== t.status) {
      const before = t.status;
      if (support.setStatus(t, body.status) === 'invalid')
        throw new HttpError(409, `A ${before} ticket can’t move to ${body.status}`, 'conflict');
      await audit(
        body.status === 'resolved' ? 'Resolved ticket' : `Changed ticket status to ${body.status}`,
        `Ticket · ${t.id}`,
        { before, after: body.status },
      );
    }
    await support.save(t);
    return { id: t.id, status: t.status, priority: t.priority, assignee: t.assigneeName };
  })(req);
}
