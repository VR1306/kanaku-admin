import { describe, expect, it } from 'vitest';
import { hasDb, useTestDb } from '@/test/db';
import { can, createRole, deleteRole, permissionsFor, updateRolePermissions } from './roles';

describe.skipIf(!hasDb)('roles', () => {
  useTestDb();
  it('super admin always has every permission and is locked', async () => {
    expect(await can('super_admin', 'team.manage')).toBe(true);
    expect(await updateRolePermissions('super_admin', [])).toBeNull();
    expect(await can('super_admin', 'audit.view')).toBe(true);
  });
  it('chat support cannot refund or see the dashboard', async () => {
    expect(await can('chat_support', 'payments.refund')).toBe(false);
    expect(await can('chat_support', 'dashboard.view')).toBe(false);
    expect(await can('chat_support', 'support.manage')).toBe(true);
  });
  it('permission edits take effect immediately (resolved per request)', async () => {
    const r = await createRole('Temp QA', ['users.view']);
    expect(await can(r.id, 'users.write')).toBe(false);
    await updateRolePermissions(r.id, ['users.view', 'users.write']);
    expect(await can(r.id, 'users.write')).toBe(true);
    expect(await deleteRole(r.id)).toBe(true);
    expect(await permissionsFor(r.id)).toEqual([]);
  });
  it('built-in roles cannot be deleted', async () => expect(await deleteRole('admin')).toBe(false));
});
