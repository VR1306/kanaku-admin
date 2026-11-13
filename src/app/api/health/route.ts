import { connection } from 'next/server';
import { getDb } from '@/lib/db';
import { describeDbProblem } from '@/lib/db-diagnose';
import { verifyMail } from '@/lib/mailer';

/**
 * GET /api/health: is this deployment wired up? Open it in a browser after deploying. It reports whether the database
 * can be reached (with the reason if not) and which settings are present: yes/no only, never the values.
 */
export async function GET(request: Request) {
  await connection();
  const started = Date.now();
  let database: { ok: boolean; ms: number; code?: string; problem?: string };
  try {
    await (await getDb()).command({ ping: 1 });
    database = { ok: true, ms: Date.now() - started };
  } catch (error) {
    const d = describeDbProblem(error);
    database = { ok: false, ms: Date.now() - started, code: d.code, problem: d.message };
  }
  const has = (k: string, min = 1) => (process.env[k] ?? '').length >= min;
  const settings = {
    MONGODB_URI: has('MONGODB_URI'),
    SESSION_SECRET: has('SESSION_SECRET', 32),
    SERVICE_API_KEY: has('SERVICE_API_KEY', 16),
    REALTIME_SECRET: has('REALTIME_SECRET', 32),
    SMTP: has('SMTP_HOST') && has('SMTP_USER') && has('SMTP_PASS'),
    USER_APP_URL: has('USER_APP_URL'),
    LANDING_URL: has('LANDING_URL'),
    LANDING_REVALIDATE_SECRET: has('LANDING_REVALIDATE_SECRET', 16),
    // optional: without it the console just refreshes on a timer instead of live
    NEXT_PUBLIC_REALTIME_URL: has('NEXT_PUBLIC_REALTIME_URL'),
  };
  // /api/health?mail=1 also tests the e-mail login (nothing is sent).
  const mail = new URL(request.url).searchParams.get('mail') ? await verifyMail() : undefined;
  return Response.json(
    { ok: database.ok && (mail?.ok ?? true), database, settings, ...(mail ? { mail } : {}) },
    { status: database.ok ? 200 : 503, headers: { 'Cache-Control': 'no-store' } },
  );
}
