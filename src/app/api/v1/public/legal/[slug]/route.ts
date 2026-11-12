import type { NextRequest } from 'next/server';
import { slugSchema } from '@/features/legal/schemas/legal';
import { ApiFault, preflight, v1 } from '@/lib/v1';
import { getPublished } from '@/services/legal';

export const OPTIONS = preflight;
/** The published Privacy Policy / Terms & Conditions: `{ title, summary, updated, version, sections }`. */
export async function GET(req: NextRequest, ctx: RouteContext<'/api/v1/public/legal/[slug]'>) {
  const slug = slugSchema.safeParse((await ctx.params).slug);
  return v1({ cache: 'public, s-maxage=60, stale-while-revalidate=300' }, async () => {
    if (!slug.success) throw new ApiFault(404, 'not_found', 'Unknown document');
    const v = await getPublished(slug.data);
    if (!v) throw new ApiFault(404, 'not_published', 'This document has not been published yet');
    return { ...v.content, version: v.version, updated: v.publishedAt };
  })(req);
}
