import type { NextRequest } from 'next/server';
import { route, HttpError } from '@/lib/bff';
import { messageBody } from '@/features/support/schemas/support';
import * as support from '@/services/support';

export async function POST(
  req: NextRequest,
  ctx: RouteContext<'/api/support/tickets/[id]/messages'>,
) {
  const { id } = await ctx.params;
  return route(
    { permission: 'support.manage', schema: messageBody, rateLimit: 60 },
    async ({ body, session, audit }) => {
      const t = await support.get(decodeURIComponent(id));
      if (!t) throw new HttpError(404, 'Ticket not found', 'not_found');
      if (t.status === 'closed') throw new HttpError(409, 'This ticket is closed', 'conflict');
      support.post(t, {
        body: body.body,
        internal: body.internal,
        author: session!.name,
        attachments: body.attachments,
      });
      await support.save(t);
      if (body.internal) await audit('Added internal note', `Ticket · ${t.id}`);
      else await support.notifyUser(t, body.body);
      return { ok: true };
    },
  )(req);
}
