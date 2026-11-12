import { z } from 'zod';
import { route, HttpError } from '@/lib/bff';
import { restore } from '@/services/content';

export const POST = route(
  { permission: 'cms.write', schema: z.object({ version: z.number().int().positive() }) },
  async ({ body, audit }) => {
    const v = await restore(body.version);
    if (!v) throw new HttpError(404, 'Version not found', 'not_found');
    await audit('Restored website version into draft', `Content · Landing page v${v.version}`);
    return { restored: v.version };
  },
);
