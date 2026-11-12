import { z } from 'zod';
import { CATEGORY_COLORS, CATEGORY_ICONS, CATEGORY_KINDS } from '@/types/admin';

export const toggleCategory = z.object({ enabled: z.boolean() });

export const categoryBody = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Name must be 2–30 characters')
    .max(30, 'Name must be 2–30 characters'),
  kind: z.enum(CATEGORY_KINDS).default('expense'),
  icon: z.enum(CATEGORY_ICONS).default('tag'),
  color: z.enum(CATEGORY_COLORS).default('cyan'),
  description: z.string().trim().max(80, 'Description max 80 characters').default(''),
  enabled: z.boolean().default(true),
});
export type CategoryInput = z.infer<typeof categoryBody>;
