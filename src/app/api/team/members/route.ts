import { route, HttpError } from '@/lib/bff';
import { inviteMember } from '@/features/team/schemas/team';
import { can, roleLabel } from '@/lib/authz';
import { sendTeamInvite } from '@/lib/mailer';
import { getRole } from '@/services/roles';
import { inviteMember as invite, isAllowedAdminEmail, listMembers } from '@/services/identity';

export const GET = route({ permission: 'team.manage' }, async () =>
  Promise.all(
    (await listMembers()).map(async (m) => ({
      id: m.id,
      name: m.name,
      email: m.email,
      role: m.role,
      roleLabel: await roleLabel(m.role),
      status: m.status,
      lastActive: m.lastActive ?? null,
      mfa: m.mfaEnrolled,
      accessExpires: m.accessExpires ?? null,
      invitedAt: m.invitedAt ?? null,
    })),
  ),
);

export const POST = route(
  { permission: 'team.manage', schema: inviteMember, rateLimit: 20 },
  async ({ body, session, audit, req }) => {
    if (!isAllowedAdminEmail(body.email))
      throw new HttpError(400, 'This email address isn’t allowed to be invited', 'validation');
    if (!(await getRole(body.role))) throw new HttpError(400, 'Unknown role', 'validation');
    // Only Super Admins may mint Super Admins.
    if (body.role === 'super_admin' && session!.role !== 'super_admin')
      throw new HttpError(403, 'Only a Super Admin can grant the Super Admin role', 'forbidden');
    if (!(await can(session!.role, 'team.manage')))
      throw new HttpError(403, 'Forbidden', 'forbidden');
    let r;
    try {
      r = await invite(body);
    } catch (e) {
      throw new HttpError(409, (e as Error).message, 'conflict');
    }
    await audit('Invited team member', `Member · ${body.email}`, {
      after: { role: body.role, accessExpires: body.accessExpires },
    });
    const origin = new URL(req.url).origin;
    const inviteLink = `${origin}/accept-invite?token=${r.token}`;
    const emailed = await sendTeamInvite(r.account.email, r.account.name, inviteLink);
    return {
      id: r.account.id,
      email: r.account.email,
      inviteLink,
      emailed,
      expiresInHours: 72,
    };
  },
);
