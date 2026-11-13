import { NextResponse, type NextRequest } from 'next/server';

const COOKIE = 'kanaku_admin_session';
const PUBLIC_PREFIXES = [
  '/login',
  '/mfa',
  '/setup',
  '/accept-invite',
  '/forgot-password',
  '/reset-password',
  '/api/auth',
  '/api/public',
  '/api/health',
  '/api/v1',
  '/docs',
  '/openapi',
  '/site',
];

// Optimistic gate only (cookie presence). Real verification + permission checks happen
// server-side in the dashboard layout and in every BFF route handler.
export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const isPublic = PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));
  if (!isPublic && !req.cookies.has(COOKIE)) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: { code: 'unauthenticated', message: 'Not signed in' } },
        { status: 401 },
      );
    }
    return NextResponse.redirect(new URL('/login', req.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon\.ico|icon\.(?:svg|png)|apple-icon\.png).*)'],
};
