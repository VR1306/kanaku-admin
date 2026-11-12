import type { NextRequest } from 'next/server';
import { route, HttpError } from '@/lib/bff';
import { sendTeamInvite } from '@/lib/mailer';
import { getAccount, resendInvite } from '@/services/identity';

export async function POST(req: NextRequest, ctx: RouteContext<'/api/team/members/[id]/resend'>) {
  const { id } = await ctx.params;
  return route({ permission: 'team.manage', rateLimit: 10 }, async ({ audit }) => {
    const m = await getAccount(id);
    if (!m || m.status !== 'invited')
      throw new HttpError(409, 'Only pending invitations can be resent', 'conflict');
    const token = await resendInvite(m); // previous link is invalidated
    await audit('Resent team invitation', `Member · ${m.email}`);
    const inviteLink = `${new URL(req.url).origin}/accept-invite?token=${token}`;
    const emailed = await sendTeamInvite(m.email, m.name, inviteLink);
    return {
      inviteLink,
      emailed,
      expiresInHours: 72,
    };
  })(req);
}
