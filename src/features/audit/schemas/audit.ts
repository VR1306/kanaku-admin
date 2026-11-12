import { z } from 'zod';

export const auditQuery = z.object({
  q: z.string().max(100).optional(),
  result: z.enum(['all', 'success', 'failed']).default('all'),
  actor: z.string().optional(),
  role: z.string().optional(),
  action: z.string().optional(),
  resource: z.string().optional(),
  ip: z.string().optional(),
  from: z.string().optional(), // YYYY-MM-DD, interpreted in IST
  to: z.string().optional(),
});
