import type { IconName } from '@/constants/icons';
import type { Permission } from '@/types/auth';

export type NavGroup = 'Overview' | 'Manage' | 'System';
export interface NavItem {
  href: string;
  label: string;
  permission: Permission;
  group: NavGroup;
  icon: IconName;
}

/** Sidebar structure, mirrored from the admin design. Only routes that exist; hidden when the role lacks the permission. */
export const NAV: NavItem[] = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    permission: 'dashboard.view',
    group: 'Overview',
    icon: 'dashboard',
  },
  { href: '/users', label: 'Users', permission: 'users.view', group: 'Overview', icon: 'users' },
  {
    href: '/billing',
    label: 'Plans & payments',
    permission: 'payments.view',
    group: 'Overview',
    icon: 'payments',
  },
  {
    href: '/categories',
    label: 'Default categories',
    permission: 'categories.write',
    group: 'Manage',
    icon: 'categories',
  },
  {
    href: '/website',
    label: 'Website content',
    permission: 'cms.write',
    group: 'Manage',
    icon: 'website',
  },
  {
    href: '/announcements',
    label: 'Announcements',
    permission: 'announcements.write',
    group: 'Manage',
    icon: 'announcements',
  },
  {
    href: '/support',
    label: 'Support',
    permission: 'support.manage',
    group: 'Manage',
    icon: 'support',
  },
  {
    href: '/team',
    label: 'Team & roles',
    permission: 'team.manage',
    group: 'System',
    icon: 'team',
  },
  { href: '/audit', label: 'Audit log', permission: 'audit.view', group: 'System', icon: 'audit' },
];
