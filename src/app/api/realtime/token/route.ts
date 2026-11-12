import { route } from '@/lib/bff';
import { mintToken } from '@/lib/realtime';
import { can } from '@/services/roles';

/** Short-lived Socket.IO connection token for the signed-in admin. Agents also join the support-staff room. */
export const GET = route({}, async ({ session }) => ({
  token: mintToken({
    kind: 'admin',
    id: session!.id,
    agent: await can(session!.role, 'support.manage'),
  }),
  url: process.env.NEXT_PUBLIC_REALTIME_URL ?? 'http://localhost:4100',
}));
