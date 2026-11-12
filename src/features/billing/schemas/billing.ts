import { z } from 'zod';
import { USER_MODULE_KEYS } from '@/constants/user-modules';

export const paymentsQuery = z.object({
  status: z.enum(['all', 'paid', 'failed', 'refunded']).default('all'),
});

export const refundBody = z
  .object({
    type: z.enum(['full', 'partial']),
    amount: z.number().positive().optional(),
    reason: z.string().min(1, 'Choose a refund reason').max(200),
    cancelAtPeriodEnd: z.boolean().default(false),
  })
  .refine((v) => v.type === 'full' || v.amount !== undefined, {
    message: 'Enter the partial refund amount',
  });

export const planUpdate = z
  .object({
    name: z.string().trim().min(1).max(40),
    description: z.string().max(120),
    badge: z.string().max(24),
    visible: z.boolean(),
    monthly: z.number().min(0).nullable(),
    yearly: z.number().min(0).nullable(),
    gstPct: z.number().min(0).max(28).default(18),
    gstMode: z.enum(['exclusive', 'inclusive']).default('exclusive'),
    modules: z.array(z.enum(USER_MODULE_KEYS)).optional(),
    maxBudgets: z.number().int().positive().nullable().optional(),
    applyToExisting: z.boolean().default(false),
    confirmExisting: z.boolean().default(false),
  })
  .refine((v) => v.monthly === null || v.yearly === null || v.yearly <= v.monthly * 12, {
    message: 'Yearly price can’t exceed 12 × the monthly price',
    path: ['yearly'],
  });
const planFields = z.object({
  name: z.string().trim().min(1, 'Plan name is required').max(40),
  description: z.string().max(120),
  badge: z.string().max(24),
  visible: z.boolean(),
  monthly: z.number().min(0).nullable(),
  yearly: z.number().min(0).nullable(),
  gstPct: z.number().min(0).max(28).default(18),
  gstMode: z.enum(['exclusive', 'inclusive']).default('exclusive'),
  modules: z.array(z.enum(USER_MODULE_KEYS)).optional(),
  maxBudgets: z.number().int().positive().nullable().optional(),
});
export const planCreate = planFields.refine(
  (v) => v.monthly === null || v.yearly === null || v.yearly <= v.monthly * 12,
  {
    message: 'Yearly price can’t exceed 12 × the monthly price',
    path: ['yearly'],
  },
);
export const planAction = z.object({ action: z.enum(['archive', 'duplicate']) });
export const planDelete = z.object({ confirmName: z.string() });

export const couponCreate = z
  .object({
    code: z.string().regex(/^[A-Z0-9]{4,20}$/, 'Code must be 4–20 uppercase letters or numbers'),
    type: z.enum(['percent', 'fixed']),
    value: z.number().positive(),
    plans: z.array(z.string()).min(1, 'Choose at least one plan'),
    duration: z.enum(['once', 'first3', 'first12', 'forever']),
    from: z.string().min(1),
    until: z.string().min(1),
    maxRedemptions: z.number().int().positive().nullable(),
    perUser: z.number().int().min(1),
    active: z.boolean().default(true),
    listed: z.boolean().default(true),
  })
  .refine((v) => v.type !== 'percent' || v.value <= 100, {
    message: 'Percentage must be 100 or less',
    path: ['value'],
  })
  .refine((v) => v.until >= v.from, {
    message: 'End date must be after start date',
    path: ['until'],
  });
export const couponPatch = z.object({
  active: z.boolean().optional(),
  archived: z.boolean().optional(),
});
