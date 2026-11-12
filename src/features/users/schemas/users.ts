import { z } from 'zod';

export const listUsersQuery = z.object({
  status: z.enum(['all', 'invited', 'active', 'inactive', 'suspended']).default('all'),
  q: z.string().max(100).optional(),
  plan: z.string().optional(),
  joinedFrom: z.string().optional(),
  joinedTo: z.string().optional(),
  activeBefore: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(8),
});

export const statusChange = z.object({
  status: z.enum(['active', 'inactive', 'suspended']),
  reason: z.string().max(200).optional(),
  notify: z.boolean().default(false),
});

export const addUserBody = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Name must be 2–60 characters')
    .max(60, 'Name must be 2–60 characters'),
  email: z.string().trim().toLowerCase().pipe(z.email('Enter a valid email')),
  phone: z.string().trim().max(20).optional(),
  plan: z.enum(['starter', 'pro_monthly', 'pro_yearly']),
  trialDays: z.union([z.literal(0), z.literal(14), z.literal(30), z.literal(90)]).default(0),
  sendInvite: z.boolean().default(true),
});

export const resetPasswordBody = z.discriminatedUnion('method', [
  z.object({ method: z.literal('link'), signOutAll: z.boolean().default(true) }),
  z.object({
    method: z.literal('temp'),
    tempPassword: z.string().min(10, 'Temporary password must be at least 10 characters'),
    signOutAll: z.boolean().default(true),
  }),
]);

export const changePlanBody = z.object({
  plan: z.enum(['starter', 'pro_monthly', 'pro_yearly']),
  effective: z.enum(['now', 'renewal']),
  reason: z.string().max(200).optional(),
  notify: z.boolean().default(true),
});

export const exportBody = z.object({ ids: z.string().optional() });

export const editUserBody = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Name must be 2–60 characters')
    .max(60, 'Name must be 2–60 characters'),
  phone: z
    .string()
    .trim()
    .regex(/^(\+?[0-9 ]{7,18})?$/, 'Enter a valid phone number')
    .default(''),
});
