import { route } from '@/lib/bff';
import { mustChangePassword, needsMfaSetup } from '@/services/identity';

export const GET = route({ stages: ['setup'] }, async ({ session }) => ({
  needsPassword: await mustChangePassword(session!.id),
  needsMfa: await needsMfaSetup(session!.id),
  email: session!.email,
}));
