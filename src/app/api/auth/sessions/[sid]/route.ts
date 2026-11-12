import type { NextRequest } from 'next/server';
import { route, HttpError } from '@/lib/bff';
import { listSessions, revokeSession } from '@/services/identity';

export async function DELETE(req: NextRequest, ctx: RouteContext<'/api/auth/sessions/[sid]'>) {
  const { sid } = await ctx.params;
  return route({}, async ({ session, audit }) => {
    if (!(await listSessions(session!.id)).some((s) => s.sid === sid))
      throw new HttpError(404, 'Session not found', 'not_found');
    await revokeSession(sid);
    await audit('Revoked session', `Session · ${sid.slice(0, 8)}`);
    return { revoked: true };
  })(req);
}
