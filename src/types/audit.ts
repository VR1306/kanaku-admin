import type { RoleId } from '@/types/auth';

export interface AuditEntry {
  id: string;
  at: string; // UTC ISO
  actor: string;
  actorRole: RoleId | 'unknown';
  action: string;
  resource: string;
  before?: unknown;
  after?: unknown;
  ip: string;
  device: string;
  result: 'success' | 'failed';
  requestId: string;
}
