import type { NextRequest } from 'next/server';
import { route, HttpError } from '@/lib/bff';
import { announcementBody } from '@/features/announcements/schemas/announcements';
import * as ann from '@/services/announcements';

export async function PUT(req: NextRequest, ctx: RouteContext<'/api/announcements/[id]'>) {
  const { id } = await ctx.params;
  return route(
    { permission: 'announcements.write', schema: announcementBody },
    async ({ body, audit }) => {
      const r = await ann.update(id, body);
      if (!r) throw new HttpError(404, 'Announcement not found', 'not_found');
      if (r === 'locked')
        throw new HttpError(
          409,
          'Only drafts and scheduled announcements can be edited',
          'conflict',
        );
      await audit('Edited announcement', `Announcement · ${r.title}`, {
        after: { publishAt: r.publishAt },
      });
      return ann.row(r);
    },
  )(req);
}
