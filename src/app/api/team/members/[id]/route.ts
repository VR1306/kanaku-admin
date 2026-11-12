import type { NextRequest } from 'next/server';
import { route, HttpError } from '@/lib/bff';
import { patchMember } from '@/features/team/schemas/team';
import { getRole } from '@/services/roles';
import { changeRole, getAccount, listMembers, removeMember } from '@/services/identity';

const superCount = async () => (await listMembers()).filter((m) => m.role === 'super_admin').length;

export async function PATCH(req: NextRequest, ctx: RouteContext<'/api/team/members/[id]'>) {
  const { id } = await ctx.params;
  return route(
    { permission: 'team.manage', schema: patchMember },
    async ({ body, session, audit }) => {
      const m = await getAccount(id);
      if (!m) throw new HttpError(404, 'Member not found', 'not_found');
      if (!(await getRole(body.role))) throw new HttpError(400, 'Unknown role', 'validation');
      if (
        (body.role === 'super_admin' || m.role === 'super_admin') &&
        session!.role !== 'super_admin'
      )
        throw new HttpError(403, 'Only a Super Admin can change Super Admin roles', 'forbidden');
      if (m.role === 'super_admin' && body.role !== 'super_admin' && (await superCount()) <= 1)
        throw new HttpError(409, 'At least one Super Admin must remain', 'conflict');
      const before = m.role;
      await changeRole(id, body.role);
      await audit('Changed member role', `Member · ${m.email}`, { before, after: body.role });
      return { id, role: body.role };
    },
  )(req);
}

export async function DELETE(req: NextRequest, ctx: RouteContext<'/api/team/members/[id]'>) {
  const { id } = await ctx.params;
  return route({ permission: 'team.manage' }, async ({ session, audit }) => {
    const m = await getAccount(id);
    if (!m) throw new HttpError(404, 'Member not found', 'not_found');
    if (m.id === session!.id) throw new HttpError(409, 'You can’t remove yourself', 'conflict');
    if (m.role === 'super_admin' && (session!.role !== 'super_admin' || (await superCount()) <= 1))
      throw new HttpError(403, 'Cannot remove this Super Admin', 'forbidden');
    await removeMember(id);
    await audit('Removed team member', `Member · ${m.email}`);
    return { removed: true };
  })(req);
}
