import type { Permission } from '@/types/auth';

export interface Member {
  id: string;
  name: string;
  email: string;
  role: string;
  roleLabel: string;
  status: 'invited' | 'active';
  lastActive: string | null;
  mfa: boolean;
  accessExpires: string | null;
  invitedAt: string | null;
}
export interface RoleRow {
  id: string;
  name: string;
  permissions: Permission[];
  builtin: boolean;
  members: number;
}
