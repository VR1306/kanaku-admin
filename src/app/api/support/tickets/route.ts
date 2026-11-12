import { route } from '@/lib/bff';
import { listQuery } from '@/features/support/schemas/support';
import * as support from '@/services/support';

export const GET = route(
  { permission: 'support.manage', schema: listQuery },
  async ({ body, session }) => {
    const q = body.q?.toLowerCase();
    // Tickets and the agent roster are independent: fetch them together.
    const [tickets, agents] = await Promise.all([support.list(), support.agents()]);
    const all = tickets.filter(
      (t) => !q || [t.subject, t.id, t.user.name].some((v) => v.toLowerCase().includes(q)),
    );
    const open = (t: { status: string }) => !['resolved', 'closed'].includes(t.status);
    const rows = {
      mine: all.filter((t) => t.assignee === session!.id && open(t)),
      unassigned: all.filter((t) => !t.assignee && open(t)),
      open: all.filter(open),
      resolved: all.filter((t) => !open(t)),
    }[body.view];
    return {
      items: rows.map((t) => ({
        ...t,
        messages: undefined,
        last: t.messages.filter((m) => !m.internal && m.from !== 'system').at(-1)?.body ?? '',
        lastAt: t.messages.filter((m) => !m.internal).at(-1)?.at ?? t.createdAt,
        lastFrom:
          t.messages.filter((m) => !m.internal && m.from !== 'system').at(-1)?.from ?? 'user',
        unread: t.messages.filter((m) => m.from === 'user' && !m.readAt).length,
        sla: support.slaBreached(t),
        ageH: Math.floor((Date.now() - new Date(t.createdAt).getTime()) / 3600_000),
      })),
      counts: {
        mine: all.filter((t) => t.assignee === session!.id && open(t)).length,
        unassigned: all.filter((t) => !t.assignee && open(t)).length,
        open: all.filter(open).length,
      },
      agents,
      quickReplies: support.QUICK_REPLIES,
    };
  },
);
