import type { NextRequest } from 'next/server';
import { route } from '@/lib/bff';
import * as support from '@/services/support';

export async function POST(
  req: NextRequest,
  ctx: RouteContext<'/api/support/tickets/[id]/typing'>,
) {
  const { id } = await ctx.params;
  return route({ permission: 'support.manage', rateLimit: 120 }, async () => {
    const t = await support.get(decodeURIComponent(id));
    if (t) {
      t.typing = { who: 'agent', until: Date.now() + 4000 };
      await support.save(t);
    }
    return { ok: true };
  })(req);
}
