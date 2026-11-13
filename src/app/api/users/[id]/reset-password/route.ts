import type { NextRequest } from 'next/server';
import { route, HttpError } from '@/lib/bff';
import { resetPasswordBody } from '@/features/users/schemas/users';
import { sendUserPasswordHelp } from '@/lib/mailer';
import { getUser, markPasswordReset } from '@/services/users';
import { signOutCustomerEverywhere } from '@/services/user-app';

export async function POST(req: NextRequest, ctx: RouteContext<'/api/users/[id]/reset-password'>) {
  const { id } = await ctx.params;
  return route(
    { permission: 'users.resetPassword', schema: resetPasswordBody, rateLimit: 10 },
    async ({ body, audit }) => {
      const u = await getUser(id);
      if (!u) throw new HttpError(404, 'User not found', 'not_found');
      const base = (process.env.USER_APP_URL ?? 'https://growwithkanaku-user.vercel.app').replace(
        /\/$/,
        '',
      );
      // The customer chooses a new password themselves through the User App's own reset page (code by e-mail).
      const emailed = await sendUserPasswordHelp(u.email, u.name, `${base}/forgot-password`);
      const signedOut = body.signOutAll ? await signOutCustomerEverywhere(id) : false;
      await markPasswordReset(id);
      await audit('Reset user password', `User · ${u.name} (${id})`, {
        after: { emailed, signOutAll: body.signOutAll, signedOut },
      });
      return { method: 'link', emailed, signedOut };
    },
  )(req);
}
