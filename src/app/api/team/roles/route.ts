import { route, HttpError } from '@/lib/bff';
import { createRoleBody } from '@/features/team/schemas/team';
import { createRole, getRole, listRoles } from '@/services/roles';
import { membersWithRole } from '@/services/identity';

export const GET = route({ permission: 'team.manage' }, async () =>
  Promise.all(
    (await listRoles()).map(async (r) => ({ ...r, members: await membersWithRole(r.id) })),
  ),
);

export const POST = route(
  { permission: 'team.manage', schema: createRoleBody },
  async ({ body, audit }) => {
    const base = body.cloneFrom ? await getRole(body.cloneFrom) : undefined;
    if (body.cloneFrom && !base) throw new HttpError(404, 'Role to clone not found', 'not_found');
    try {
      const r = await createRole(
        body.name,
        body.permissions ?? (base?.permissions ? [...base.permissions] : []),
      );
      await audit('Created role', `Role · ${r.name}`, { after: r.permissions });
      return r;
    } catch (e) {
      throw new HttpError(409, (e as Error).message, 'conflict');
    }
  },
);
