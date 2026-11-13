import { route, HttpError } from '@/lib/bff';
import { addUserBody, listUsersQuery } from '@/features/users/schemas/users';
import { sendUserInvite } from '@/lib/mailer';
import { addUser, emailTaken, listUsers } from '@/services/users';

const signupUrl = () =>
  `${(process.env.USER_APP_URL ?? 'https://growwithkanaku-user.vercel.app').replace(/\/$/, '')}/signup`;

export const GET = route(
  { permission: 'users.view', schema: listUsersQuery },
  async ({ body }) => await listUsers(body),
);

export const POST = route(
  { permission: 'users.write', schema: addUserBody, rateLimit: 30 },
  async ({ body, audit }) => {
    if (await emailTaken(body.email))
      throw new HttpError(409, 'A user with this email already exists', 'conflict');
    const { user } = await addUser(body);
    // The User App has no "accept invite" page: the invitation is an e-mail asking them to sign up with this address.
    const emailed = body.sendInvite
      ? await sendUserInvite(user.email, user.name, signupUrl())
      : false;
    await audit('Created user (invited)', `User · ${user.name} (${user.id})`, {
      after: { plan: body.plan, trialDays: body.trialDays, sendInvite: body.sendInvite, emailed },
    });
    return {
      user,
      inviteLink: signupUrl(),
      emailed,
    };
  },
);
