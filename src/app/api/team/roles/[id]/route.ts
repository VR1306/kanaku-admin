import type { NextRequest } from 'next/server';
import { route, HttpError } from '@/lib/bff';
import { updateRoleBody } from '@/features/team/schemas/team';
import { deleteRole, getRole, renameRole, updateRolePermissions } from '@/services/roles';
import { membersWithRole } from '@/services/identity';

export async function PUT(req: NextRequest, ctx: RouteContext<'/api/team/roles/[id]'>) {
  const { id } = await ctx.params;
  return route({ permission: 'team.manage', schema: updateRoleBody }, async ({ body, audit }) => {
    const before = await getRole(id);
    if (!before) throw new HttpError(404, 'Role not found', 'not_found');
    if (id === 'super_admin')
      throw new HttpError(403, 'Super Admin permissions are locked', 'forbidden');
    const prev = [...before.permissions];
    if (body.name) {
      if (!(await renameRole(id, body.name)))
        throw new HttpError(409, 'Built-in roles can’t be renamed', 'conflict');
    }
    if (body.permissions) await updateRolePermissions(id, body.permissions);
    const added = (body.permissions ?? prev).filter((p) => !prev.includes(p));
    const removed = prev.filter((p) => !(body.permissions ?? prev).includes(p));
    await audit('Changed role permissions', `Role · ${before.name}`, {
      before: prev,
      after: { added, removed },
    });
    return { id, added, removed };
  })(req);
}

export async function DELETE(req: NextRequest, ctx: RouteContext<'/api/team/roles/[id]'>) {
  const { id } = await ctx.params;
  return route({ permission: 'team.manage' }, async ({ audit }) => {
    const r = await getRole(id);
    if (!r) throw new HttpError(404, 'Role not found', 'not_found');
    if (r.builtin) throw new HttpError(409, 'Built-in roles can’t be deleted', 'conflict');
    if ((await membersWithRole(id)) > 0)
      throw new HttpError(409, 'Reassign this role’s members before deleting it', 'conflict');
    await deleteRole(id);
    await audit('Deleted role', `Role · ${r.name}`);
    return { deleted: true };
  })(req);
}
