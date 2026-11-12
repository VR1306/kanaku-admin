import 'server-only';
import { NextResponse, type NextRequest } from 'next/server';
import type { ZodType } from 'zod';
import { can } from '@/services/roles';
import { readSession, touchSession } from '@/lib/session';
import { record } from '@/services/audit';
import { touchDevice } from '@/services/identity';
import type { Permission, SessionPayload } from '@/types/auth';

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
    public code = 'error',
  ) {
    super(message);
  }
}

interface Ctx<B> {
  req: NextRequest;
  body: B;
  session: SessionPayload | null;
  requestId: string;
  /** Record an audit entry for this request's actor. */
  audit: (
    action: string,
    resource: string,
    extra?: { before?: unknown; after?: unknown; result?: 'success' | 'failed' },
  ) => void;
}

interface Opts<B> {
  /** Permission required. Omit only for public/pre-auth endpoints (login etc). */
  permission?: Permission;
  /** Allow a half-authenticated session in these stages (e.g. 'mfa' on the MFA endpoint, 'setup' during first-login). */
  stages?: Array<'mfa' | 'setup'>;
  public?: boolean;
  schema?: ZodType<B>;
  /** Max requests per minute per IP+route for sensitive endpoints. */
  rateLimit?: number;
}

const hits = new Map<string, number[]>();
function limited(key: string, max: number) {
  const now = Date.now();
  const recent = (hits.get(key) ?? []).filter((t) => now - t < 60_000);
  recent.push(now);
  hits.set(key, recent);
  return recent.length > max;
}

const clientIp = (req: NextRequest) =>
  req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown';

/**
 * Wraps a route handler with: request id, same-origin CSRF check on writes, session + server-side
 * permission check (403), rate limiting, zod validation and uniform error responses.
 */
export function route<B = undefined>(opts: Opts<B>, fn: (c: Ctx<B>) => Promise<unknown>) {
  return async (req: NextRequest): Promise<NextResponse> => {
    const requestId = req.headers.get('x-request-id') ?? crypto.randomUUID();
    const fail = (status: number, message: string, code = 'error') =>
      NextResponse.json(
        { error: { code, message, requestId } },
        { status, headers: { 'x-request-id': requestId } },
      );
    try {
      const write = !['GET', 'HEAD', 'OPTIONS'].includes(req.method);
      if (
        write &&
        req.headers.get('origin') &&
        new URL(req.headers.get('origin')!).host !== req.headers.get('host')
      ) {
        return fail(403, 'Cross-origin request blocked', 'csrf');
      }
      if (opts.rateLimit && limited(`${clientIp(req)}:${req.nextUrl.pathname}`, opts.rateLimit)) {
        return fail(429, 'Too many requests. Try again shortly.', 'rate_limited');
      }

      const session = await readSession();
      if (!opts.public) {
        if (!session || (session.stage !== 'active' && !opts.stages?.includes(session.stage)))
          return fail(401, 'Not signed in', 'unauthenticated');
        if (opts.permission && !(await can(session.role, opts.permission))) {
          await record({
            actor: session.email,
            actorRole: session.role,
            action: 'Permission denied',
            resource: `${req.method} ${req.nextUrl.pathname}`,
            ip: clientIp(req),
            device: req.headers.get('user-agent') ?? '',
            result: 'failed',
            requestId,
          });
          return fail(403, 'You do not have permission to do this', 'forbidden');
        }
      }

      let body = undefined as B;
      if (opts.schema) {
        const raw = write
          ? await req.json().catch(() => null)
          : Object.fromEntries(req.nextUrl.searchParams);
        const parsed = opts.schema.safeParse(raw);
        if (!parsed.success)
          return fail(400, parsed.error.issues[0]?.message ?? 'Invalid request', 'validation');
        body = parsed.data;
      }

      if (session?.stage === 'active') {
        await touchSession(session);
        await touchDevice(session.sid);
      }

      const pending: Promise<unknown>[] = [];
      const audit: Ctx<B>['audit'] = (action, resource, extra = {}) => {
        const p = record({
          actor: session?.email ?? 'unknown',
          actorRole: session?.role ?? 'unknown',
          action,
          resource,
          before: extra.before,
          after: extra.after,
          ip: clientIp(req),
          device: req.headers.get('user-agent') ?? '',
          result: extra.result ?? 'success',
          requestId,
        });
        pending.push(p);
        return p;
      };

      let data;
      try {
        data = await fn({ req, body, session, requestId, audit });
      } finally {
        await Promise.allSettled(pending); // audit entries are durable before the response is sent
      }
      return NextResponse.json({ data }, { headers: { 'x-request-id': requestId } });
    } catch (e) {
      if (e instanceof HttpError) return fail(e.status, e.message, e.code);
      console.error(`[bff ${requestId}]`, e);
      return fail(500, 'Something went wrong', 'internal');
    }
  };
}
