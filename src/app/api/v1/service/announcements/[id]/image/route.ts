import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { serviceKeyValid } from '@/lib/v1';
import { get } from '@/services/announcements';

/**
 * The announcement's image as binary, for the User App's notification centre (service key only: images are never public).
 * Stored as an uploaded data URL (PNG / JPEG / WebP, ≤ 2 MB); streamed back with its real content type.
 */
export async function GET(
  req: NextRequest,
  ctx: RouteContext<'/api/v1/service/announcements/[id]/image'>,
) {
  if (!serviceKeyValid(req))
    return NextResponse.json(
      { error: { code: 'unauthenticated', message: 'Invalid service key' } },
      { status: 401 },
    );
  const { id } = await ctx.params;
  const a = await get(id);
  const m =
    a?.image && /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/.exec(a.image.dataUrl);
  if (!m)
    return NextResponse.json(
      { error: { code: 'not_found', message: 'No image' } },
      { status: 404 },
    );
  return new NextResponse(Buffer.from(m[2], 'base64'), {
    headers: {
      'content-type': m[1],
      'cache-control': 'private, max-age=86400',
      'x-content-type-options': 'nosniff',
    },
  });
}
