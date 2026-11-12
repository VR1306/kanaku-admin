import { route, HttpError } from '@/lib/bff';
import { passwordBody } from '@/features/profile/schemas/profile';
import { changePassword } from '@/services/identity';

export const POST = route(
  { schema: passwordBody, rateLimit: 5 },
  async ({ body, session, audit }) => {
    const r = await changePassword(session!.id, body.current, body.next, session!.sid);
    if (r !== 'ok') {
      await audit('Password change failed', `Account · ${session!.email}`, { result: 'failed' });
      throw new HttpError(
        400,
        r === 'wrong' ? 'Your current password is incorrect' : 'Account not found',
        'invalid_credentials',
      );
    }
    await audit('Changed own password', `Account · ${session!.email}`, {
      after: { otherSessionsSignedOut: true },
    });
    return { ok: true };
  },
);
