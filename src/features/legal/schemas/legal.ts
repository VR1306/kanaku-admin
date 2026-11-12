import { z } from 'zod';
import { LEGAL_SLUGS } from '@/types/legal';

export const slugSchema = z.enum(LEGAL_SLUGS);
const block = z.union([
  z.string().trim().min(1).max(4000),
  z.array(z.string().trim().min(1).max(1000)).min(1).max(40),
]);
export const legalContentSchema = z
  .object({
    title: z.string().trim().min(1, 'Title is required').max(80),
    summary: z.string().trim().max(300),
    sections: z
      .array(
        z.object({
          id: z
            .string()
            .regex(
              /^[a-z0-9][a-z0-9-]{0,40}$/,
              'Section id: lowercase letters, numbers and dashes',
            ),
          title: z.string().trim().min(1, 'Every section needs a title').max(100),
          blocks: z.array(block).min(1, 'Every section needs some text').max(40),
        }),
      )
      .min(1, 'Add at least one section')
      .max(30),
  })
  .refine((c) => new Set(c.sections.map((s) => s.id)).size === c.sections.length, {
    message: 'Section ids must be unique',
    path: ['sections'],
  });
