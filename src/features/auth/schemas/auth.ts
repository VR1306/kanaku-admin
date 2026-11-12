import { z } from 'zod';

export const emailField = z.string().trim().toLowerCase().pipe(z.email('Enter a valid work email'));

/** Same rules the user app shows on reset: 8+ chars, a number, a special character. */
export const passwordRules = [
  { id: 'len', label: 'At least 8 characters', test: (p: string) => p.length >= 8 },
  { id: 'num', label: 'One number', test: (p: string) => /\d/.test(p) },
  { id: 'special', label: 'One special character', test: (p: string) => /[^A-Za-z0-9]/.test(p) },
] as const;

export const newPassword = z
  .string()
  .refine(
    (p) => passwordRules.every((r) => r.test(p)),
    'Password must be 8+ characters with a number and a special character',
  );

export const loginSchema = z.object({
  email: emailField,
  password: z.string().min(8, 'Password must be at least 8 characters'),
  remember: z.boolean().optional(),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const code6 = z.string().regex(/^\d{6}$/, 'Enter the 6-digit code');
export const mfaSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^(\d{6}|[0-9a-f]{8})$/i, 'Enter the 6-digit code or an 8-character backup code'),
});
export type MfaInput = z.infer<typeof mfaSchema>;

export const forgotSchema = z.object({ email: emailField });
export const resetSchema = z.object({ email: emailField, code: code6, password: newPassword });
export const inviteSchema = z.object({ token: z.string().min(20), password: newPassword });
export const setPasswordSchema = z.object({ password: newPassword });
export const confirmMfaSchema = z.object({ code: code6 });
