import { route } from '@/lib/bff';
import { mintToken } from '@/lib/realtime';
import { can } from '@/services/roles';

/** The realtime service address, or null when none is configured (the console then just refreshes on a timer). */
function realtimeUrl(): string | null {
  const v = process.env.NEXT_PUBLIC_REALTIME_URL?.trim();
  if (v && /^(https?|wss?):\/\/[^<>\s]+$/i.test(v)) return v; // a leftover "<PLACEHOLDER>" is not a URL
  return process.env.NODE_ENV === 'production' ? null : 'http://localhost:4100';
}

/** Short-lived Socket.IO connection token for the signed-in admin. Agents also join the support-staff room. */
export const GET = route({}, async ({ session }) => ({
  token: mintToken({
    kind: 'admin',
    id: session!.id,
    agent: await can(session!.role, 'support.manage'),
  }),
  url: realtimeUrl(),
}));
