import type { NextRequest } from 'next/server';
import { route, HttpError } from '@/lib/bff';
import { legalContentSchema, slugSchema } from '@/features/legal/schemas/legal';
import { revalidateLanding } from '@/services/landing-revalidate';
import { getState, publish } from '@/services/legal';

export async function POST(req: NextRequest, ctx: RouteContext<'/api/legal/[slug]/publish'>) {
  const slug = slugSchema.safeParse((await ctx.params).slug);
  return route({ permission: 'cms.write', rateLimit: 20 }, async ({ session, audit }) => {
    if (!slug.success) throw new HttpError(404, 'Unknown document', 'not_found');
    const parsed = legalContentSchema.safeParse((await getState(slug.data)).draft);
    if (!parsed.success)
      throw new HttpError(400, parsed.error.issues[0]?.message ?? 'Draft is invalid', 'validation');
    const v = await publish(slug.data, session!.email);
    revalidateLanding(['landing-legal']);
    await audit('Published legal document', `Content · ${slug.data} v${v.version}`, {
      after: { version: v.version },
    });
    return { version: v.version };
  })(req);
}
