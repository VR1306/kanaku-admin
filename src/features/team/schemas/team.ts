import { z } from 'zod';
import { PERMISSIONS } from '@/types/auth';

export const inviteMember = z.object({
  name: z.string().trim().min(2, 'Name must be 2–60 characters').max(60),
  email: z.string().trim().toLowerCase().pipe(z.email('Enter a valid work email')),
  role: z.string().min(1),
  accessExpires: z.string().optional(),
});
export const patchMember = z.object({ role: z.string().min(1) });
export const permissionList = z.array(z.enum(PERMISSIONS));
export const createRoleBody = z.object({
  name: z.string().trim().min(2).max(40),
  cloneFrom: z.string().optional(),
  permissions: permissionList.optional(),
});
export const updateRoleBody = z.object({
  permissions: permissionList.optional(),
  name: z.string().trim().min(2).max(40).optional(),
});
