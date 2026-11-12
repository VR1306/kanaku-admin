import { z } from 'zod';
import { route } from '@/lib/bff';
import { listFor, markRead } from '@/services/notifications';

export const GET = route({}, async ({ session }) => listFor(session!.id));
export const POST = route(
  { schema: z.object({ id: z.string().optional() }) },
  async ({ session, body }) => {
    await markRead(session!.id, body.id);
    return { ok: true };
  },
);
