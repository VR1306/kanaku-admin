import type { NextRequest } from 'next/server';
import { route, HttpError } from '@/lib/bff';
import { sendUserInvite } from '@/lib/mailer';
import { getUser, resendInvite } from '@/services/users';

export async function POST(req: NextRequest, ctx: RouteContext<'/api/users/[id]/resend-invite'>) {
  const { id } = await ctx.params;
  return route({ permission: 'users.write', rateLimit: 10 }, async ({ audit }) => {
    const token = await resendInvite(id);
    if (!token) throw new HttpError(409, 'Only invited users can be re-invited', 'conflict');
    const u = (await getUser(id))!;
    const link = `${(process.env.USER_APP_URL ?? 'https://growwithkanaku-user.vercel.app').replace(/\/$/, '')}/signup`;
    const emailed = await sendUserInvite(u.email, u.name, link);
    await audit('Resent user invitation', `User · ${u.name} (${id})`, { after: { emailed } });
    return { inviteLink: link, emailed };
  })(req);
}
