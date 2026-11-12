import { route } from '@/lib/bff';
import { listSessions, revokeAll } from '@/services/identity';

/** "Revoke all other sessions": signs out every device except the current one. */
export const POST = route({ rateLimit: 10 }, async ({ session, audit }) => {
  const n = (await listSessions(session!.id)).filter((s) => s.sid !== session!.sid).length;
  await revokeAll(session!.id, session!.sid);
  await audit('Revoked all other sessions', `Account · ${session!.email}`, { after: { count: n } });
  return { revoked: n };
});
