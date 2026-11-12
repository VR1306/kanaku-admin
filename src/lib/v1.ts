import 'server-only';
import { timingSafeEqual } from 'node:crypto';
import { connection, NextResponse, type NextRequest } from 'next/server';

/**
 * Helpers for the versioned integration API (/api/v1/*) used by the Landing Page and the User App.
 * - public routes: unauthenticated, read-only, cacheable, CORS-enabled.
 * - service routes: server-to-server, `Authorization: Bearer <SERVICE_API_KEY>`.
 */
export class ApiFault extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}

const corsHeaders = (req: NextRequest): Record<string, string> => {
  const allowed = (process.env.PUBLIC_API_ORIGINS ?? '*').split(',').map((s) => s.trim());
  const origin = req.headers.get('origin') ?? '';
  const ok = allowed.includes('*') ? '*' : allowed.includes(origin) ? origin : '';
  return ok
    ? {
        'access-control-allow-origin': ok,
        'access-control-allow-methods': 'GET,POST,OPTIONS',
        'access-control-allow-headers': 'authorization,content-type',
        vary: 'origin',
      }
    : {};
};

export const preflight = (req: NextRequest) =>
  new NextResponse(null, { status: 204, headers: corsHeaders(req) });

export function serviceKeyValid(req: NextRequest, envName = 'SERVICE_API_KEY'): boolean {
  const key = process.env[envName];
  const given = req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? '';
  if (!key || key.length < 16) return false;
  const a = Buffer.from(key);
  const b = Buffer.from(given);
  return a.length === b.length && timingSafeEqual(a, b);
}

interface Opts {
  /** Require the service key. */
  service?: boolean;
  /** `Cache-Control` for successful GETs. */
  cache?: string;
  /** Return the payload as-is instead of wrapping in `{ data }`. */
  raw?: boolean;
}

export function v1<T>(opts: Opts, fn: (req: NextRequest) => Promise<T>) {
  return async (req: NextRequest) => {
    await connection();
    const headers = { ...corsHeaders(req), 'x-content-type-options': 'nosniff' };
    try {
      if (opts.service && !serviceKeyValid(req))
        throw new ApiFault(401, 'unauthenticated', 'Missing or invalid service key');
      const out = await fn(req);
      return NextResponse.json(opts.raw ? out : { data: out }, {
        headers: { ...headers, 'cache-control': opts.cache ?? 'no-store' },
      });
    } catch (e) {
      if (e instanceof ApiFault)
        return NextResponse.json(
          { error: { code: e.code, message: e.message } },
          { status: e.status, headers },
        );
      console.error('[v1]', req.method, req.nextUrl.pathname, e);
      return NextResponse.json(
        { error: { code: 'internal', message: 'Something went wrong' } },
        { status: 500, headers },
      );
    }
  };
}
