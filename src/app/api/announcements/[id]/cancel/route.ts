import type { NextRequest } from 'next/server';
import { route, HttpError } from '@/lib/bff';
import * as ann from '@/services/announcements';

export async function POST(req: NextRequest, ctx: RouteContext<'/api/announcements/[id]/cancel'>) {
  const { id } = await ctx.params;
  return route({ permission: 'announcements.write' }, async ({ audit }) => {
    const a = await ann.cancel(id);
    if (!a) throw new HttpError(409, 'Only scheduled announcements can be cancelled', 'conflict');
    await audit('Cancelled scheduled announcement', `Announcement · ${a.title}`);
    return ann.row(a);
  })(req);
}
