import { route, HttpError } from '@/lib/bff';
import { profileBody } from '@/features/profile/schemas/profile';
import { roleLabel } from '@/lib/authz';
import { getAccount, updateProfile } from '@/services/identity';

const shape = async (id: string) => {
  const a = await getAccount(id);
  if (!a) throw new HttpError(404, 'Account not found', 'not_found');
  return {
    id: a.id,
    name: a.name,
    email: a.email,
    phone: a.phone ?? '',
    avatar: a.avatar ?? null,
    role: a.role,
    roleLabel: await roleLabel(a.role),
    mfa: a.mfaEnrolled,
    lastActive: a.lastActive ?? null,
  };
};

// Any signed-in admin may view and edit their OWN profile; email and role are controlled by the identity service / Super Admins.
export const GET = route({}, async ({ session }) => await shape(session!.id));

export const PUT = route(
  { schema: profileBody, rateLimit: 20 },
  async ({ body, session, audit }) => {
    const r = await updateProfile(session!.id, body);
    if (!r) throw new HttpError(404, 'Account not found', 'not_found');
    await audit('Updated own profile', `Account · ${session!.email}`, {
      before: r.before,
      after: { name: body.name, phone: body.phone },
    });
    return await shape(session!.id);
  },
);
