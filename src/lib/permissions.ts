import type { Permission } from '@/types/auth';
import { PERMISSIONS } from '@/types/auth';

/** Client-safe metadata + built-in role seeds. Runtime role data lives in services/roles. */
export const PERMISSION_GROUPS: Array<{
  group: string;
  items: Array<{ key: Permission; label: string }>;
}> = [
  {
    group: 'Dashboard & reports',
    items: [{ key: 'dashboard.view', label: 'View dashboard & reports' }],
  },
  {
    group: 'Users',
    items: [
      { key: 'users.view', label: 'View users' },
      { key: 'users.write', label: 'Add, edit, disable users' },
      { key: 'users.suspend', label: 'Suspend or reinstate users' },
      { key: 'users.resetPassword', label: 'Reset user passwords' },
      { key: 'users.changePlan', label: 'Change user plans' },
      { key: 'users.export', label: 'Export users (CSV)' },
    ],
  },
  {
    group: 'Plans & payments',
    items: [
      { key: 'payments.view', label: 'View payments' },
      { key: 'payments.refund', label: 'Refund payments' },
      { key: 'coupons.write', label: 'Create and edit coupons' },
      { key: 'plans.write', label: 'Edit plans & pricing' },
    ],
  },
  {
    group: 'Content & configuration',
    items: [
      { key: 'categories.write', label: 'Default categories' },
      { key: 'cms.write', label: 'Website content' },
      { key: 'announcements.write', label: 'Announcements' },
    ],
  },
  { group: 'Support', items: [{ key: 'support.manage', label: 'Support tickets & live chat' }] },
  {
    group: 'System',
    items: [
      { key: 'audit.view', label: 'View audit log' },
      { key: 'team.manage', label: 'Manage team & roles' },
    ],
  },
];

export interface RoleSeed {
  id: string;
  name: string;
  permissions: Permission[];
  builtin: boolean;
}

export const BUILTIN_ROLES: RoleSeed[] = [
  { id: 'super_admin', name: 'Super Admin', builtin: true, permissions: [...PERMISSIONS] },
  {
    id: 'admin',
    name: 'Admin',
    builtin: true,
    permissions: [
      'dashboard.view',
      'users.view',
      'users.write',
      'users.suspend',
      'users.resetPassword',
      'users.changePlan',
      'users.export',
      'payments.view',
      'payments.refund',
      'coupons.write',
      'categories.write',
      'cms.write',
      'announcements.write',
      'support.manage',
      'audit.view',
    ],
  },
  {
    id: 'analyst',
    name: 'Analyst',
    builtin: true,
    permissions: ['dashboard.view', 'users.view', 'payments.view', 'audit.view'],
  },
  {
    id: 'chat_support',
    name: 'Chat Support',
    builtin: true,
    permissions: ['users.view', 'users.resetPassword', 'support.manage'],
  },
  { id: 'coupon_creator', name: 'Coupon Creator', builtin: true, permissions: ['coupons.write'] },
];
