import { route } from '@/lib/bff';
import { avatarBody } from '@/features/profile/schemas/profile';
import { setAvatar } from '@/services/identity';

export const POST = route(
  { schema: avatarBody, rateLimit: 10 },
  async ({ body, session, audit }) => {
    await setAvatar(session!.id, body.dataUrl);
    await audit('Changed profile photo', `Account · ${session!.email}`);
    return { ok: true };
  },
);

export const DELETE = route({}, async ({ session, audit }) => {
  await setAvatar(session!.id, null);
  await audit('Removed profile photo', `Account · ${session!.email}`);
  return { ok: true };
});
