import { route, HttpError } from '@/lib/bff';
import { addUserBody, listUsersQuery } from '@/features/users/schemas/users';
import { addUser, emailTaken, listUsers } from '@/services/users';

export const GET = route(
  { permission: 'users.view', schema: listUsersQuery },
  async ({ body }) => await listUsers(body),
);

export const POST = route(
  { permission: 'users.write', schema: addUserBody, rateLimit: 30 },
  async ({ body, audit }) => {
    if (await emailTaken(body.email))
      throw new HttpError(409, 'A user with this email already exists', 'conflict');
    const { user, token } = await addUser(body);
    await audit('Created user (invited)', `User · ${user.name} (${user.id})`, {
      after: { plan: body.plan, trialDays: body.trialDays, sendInvite: body.sendInvite },
    });
    return {
      user,
      inviteLink: `${process.env.USER_APP_URL ?? 'https://growwithkanaku-user.vercel.app'}/invite?token=${token}`,
      expiresInDays: 7,
    };
  },
);
