import { z } from 'zod';
import { ApiFault, v1 } from '@/lib/v1';
import { col } from '@/lib/db';
import type { AppUser } from '@/types/users';

const body = z.object({
  userId: z.string().min(1).max(80),
  name: z.string().trim().min(1).max(80),
  email: z.email().max(160),
  phone: z.string().max(30).default(''),
  plan: z.enum(['starter', 'pro_monthly', 'pro_yearly']).default('starter'),
  status: z.enum(['invited', 'active', 'inactive', 'suspended']).default('active'),
  joined: z.string().optional(),
  lastActive: z.string().optional(),
  renewsOn: z.string().nullable().optional(),
  mfa: z.boolean().optional(),
  location: z.string().max(80).optional(),
  notify: z
    .object({ inApp: z.boolean(), email: z.boolean(), push: z.boolean(), sms: z.boolean() })
    .optional(),
  pushTokens: z.array(z.string().max(400)).max(10).optional(),
});

/**
 * Server-to-server: the User App mirrors its users here (sign-up, plan/profile change, consent change, device token)
 * so the Admin Portal's directory, reach and announcement audiences reflect real users. Idempotent upsert by userId.
 */
export const POST = v1({ service: true }, async (req) => {
  const r = body.safeParse(await req.json().catch(() => null));
  if (!r.success)
    throw new ApiFault(400, 'validation', r.error.issues[0]?.message ?? 'Invalid body');
  const { userId, joined, lastActive, ...rest } = r.data;
  const users = await col<Omit<AppUser, 'id'> & { _id: string }>('app_users');
  const now = new Date().toISOString();
  const email = rest.email.toLowerCase();
  const clash = await users.findOne({ email, _id: { $ne: userId } }, { projection: { _id: 1 } });
  if (clash) throw new ApiFault(409, 'email_conflict', 'Another user already has this email');
  // Fields the caller didn't send keep their value, or get a default on first insert (never both: Mongo rejects overlap).
  const defaults = {
    joined: (joined ?? now).slice(0, 10),
    renewsOn: null,
    mfa: false,
    location: '',
    lastPasswordChange: null,
  };
  const set = { ...rest, email, lastActive: lastActive ?? now };
  const onInsert = Object.fromEntries(Object.entries(defaults).filter(([k]) => !(k in set)));
  await users.updateOne({ _id: userId }, { $set: set, $setOnInsert: onInsert }, { upsert: true });
  return { synced: true, userId };
});
