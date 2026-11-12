import { z } from 'zod';

export const RANGES = ['7d', '30d', '90d', '12m', 'custom'] as const;
export const dashboardQuery = z
  .object({
    range: z.enum(RANGES).default('30d'),
    from: z.string().optional(),
    to: z.string().optional(),
  })
  .refine((v) => v.range !== 'custom' || (v.from && v.to && v.from <= v.to), {
    message: 'Choose a valid custom date range',
    path: ['from'],
  });
