import { z } from 'zod';
import { route } from '@/lib/bff';
import { clearSession } from '@/lib/session';

export const POST = route(
  { stages: ['mfa', 'setup'], schema: z.object({ reason: z.enum(['idle']).optional() }) },
  async ({ body, audit }) => {
    await audit(body.reason === 'idle' ? 'Session expired (idle)' : 'Signed out', 'Session');
    await clearSession();
    return { next: '/login' };
  },
);
