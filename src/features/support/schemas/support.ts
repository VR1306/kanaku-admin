import { z } from 'zod';

export const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'application/pdf'];
export const MAX_ATTACHMENT = 5 * 1024 * 1024;

export const messageBody = z.object({
  body: z.string().trim().min(1, 'Write a message').max(2000),
  internal: z.boolean().default(false),
  attachments: z
    .array(
      z.object({
        name: z.string().max(120),
        size: z.number().max(MAX_ATTACHMENT, 'Attachments must be 5 MB or smaller'),
        type: z
          .string()
          .refine((t) => ALLOWED_TYPES.includes(t), 'Only JPG, PNG or PDF attachments'),
      }),
    )
    .max(3)
    .optional(),
});
export const patchTicket = z.object({
  status: z.enum(['open', 'assigned', 'waiting', 'resolved', 'closed']).optional(),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  assignee: z.string().nullable().optional(),
});
export const listQuery = z.object({
  view: z.enum(['mine', 'unassigned', 'open', 'resolved']).default('open'),
  q: z.string().optional(),
});
