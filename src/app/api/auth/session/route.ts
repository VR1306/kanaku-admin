import { route } from '@/lib/bff';
import { permissionsFor, roleLabel } from '@/lib/authz';
import { IDLE_S } from '@/lib/session';

export const GET = route({}, async ({ session }) => ({
  user: {
    name: session!.name,
    email: session!.email,
    role: session!.role,
    roleLabel: await roleLabel(session!.role),
  },
  permissions: await permissionsFor(session!.role),
  // Lets the client show the 2-minute idle warning without ever reading the cookie.
  idleExpiresAt: (session!.seen + IDLE_S) * 1000,
  absoluteExpiresAt: session!.exp * 1000,
}));
