import { z } from 'zod';
import { newPassword } from '@/features/auth/schemas/auth';

export const profileBody = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Name must be 2–60 characters')
    .max(60, 'Name must be 2–60 characters'),
  phone: z
    .string()
    .trim()
    .regex(/^(\+?[0-9 ]{7,18})?$/, 'Enter a valid phone number')
    .optional()
    .default(''),
});
export type ProfileInput = z.infer<typeof profileBody>;

/** Cropped avatars are 256×256 JPEG/PNG/WebP data URLs. */
export const avatarBody = z.object({
  dataUrl: z
    .string()
    .max(400_000, 'Photo is too large')
    .regex(/^data:image\/(png|jpeg|webp);base64,/, 'Use a PNG, JPG or WebP image'),
});

export const passwordBody = z.object({
  current: z.string().min(1, 'Enter your current password'),
  next: newPassword,
});
