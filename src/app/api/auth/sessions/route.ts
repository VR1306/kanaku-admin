import { route } from '@/lib/bff';
import { listSessions } from '@/services/identity';

export const GET = route({}, async ({ session }) =>
  (await listSessions(session!.id)).map((s) => ({ ...s, current: s.sid === session!.sid })),
);
