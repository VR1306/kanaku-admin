import type { NextRequest } from 'next/server';
import { route, HttpError } from '@/lib/bff';
import { getAccount, resetMemberMfa } from '@/services/identity';

export async function POST(
  req: NextRequest,
  ctx: RouteContext<'/api/team/members/[id]/reset-mfa'>,
) {
  const { id } = await ctx.params;
  return route({ permission: 'team.manage', rateLimit: 10 }, async ({ session, audit }) => {
    const m = await getAccount(id);
    if (!m) throw new HttpError(404, 'Member not found', 'not_found');
    if (m.role === 'super_admin' && session!.role !== 'super_admin')
      throw new HttpError(403, 'Only a Super Admin can reset a Super Admin’s MFA', 'forbidden');
    await resetMemberMfa(id);
    await audit('Reset member MFA', `Member · ${m.email}`);
    return { reset: true };
  })(req);
}
