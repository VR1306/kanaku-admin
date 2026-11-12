import type { NextRequest } from 'next/server';
import { route, HttpError } from '@/lib/bff';
import { legalContentSchema, slugSchema } from '@/features/legal/schemas/legal';
import { saveDraft } from '@/services/legal';

export async function PUT(req: NextRequest, ctx: RouteContext<'/api/legal/[slug]/draft'>) {
  const slug = slugSchema.safeParse((await ctx.params).slug);
  return route(
    { permission: 'cms.write', schema: legalContentSchema, rateLimit: 60 },
    async ({ body, audit }) => {
      if (!slug.success) throw new HttpError(404, 'Unknown document', 'not_found');
      await saveDraft(slug.data, body);
      await audit('Saved legal draft', `Content · ${slug.data}`);
      return { saved: true };
    },
  )(req);
}
