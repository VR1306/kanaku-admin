import 'server-only';
import { createHash, randomBytes } from 'node:crypto';
import { col, newId } from '@/lib/db';
import type { AppUser, PlanId, UserDetail, UserPage, UserStatus } from '@/types/users';

// End-user directory (MongoDB `app_users`, `user_invites`). The admin console is the system of record for these
// records until the user app is wired to the same database (see docs/API_INTEGRATION.md).
type UserDoc = Omit<AppUser, 'id'> & { _id: string };
interface InviteDoc {
  hash: string;
  userId: string;
  exp: Date;
  used: boolean;
}
const users = () => col<UserDoc>('app_users');
const invites = () => col<InviteDoc>('user_invites');
const toUser = ({ _id, ...rest }: UserDoc): AppUser => ({ id: _id, ...rest });
const hash = (s: string) => createHash('sha256').update(s).digest('hex');
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const today = () => new Date().toISOString().slice(0, 10);

export interface UserQuery {
  status?: UserStatus | 'all';
  q?: string;
  plan?: string;
  joinedFrom?: string;
  joinedTo?: string;
  activeBefore?: string;
  page: number;
  pageSize: number;
}

export async function listUsers(q: UserQuery): Promise<UserPage> {
  const c = await users();
  const f: Record<string, unknown> = {};
  const needle = q.q?.trim();
  if (needle) {
    const r = { $regex: esc(needle), $options: 'i' };
    f.$or = [{ name: r }, { email: r }, { _id: r }];
  }
  if (q.plan && q.plan !== 'all') f.plan = q.plan;
  if (q.joinedFrom || q.joinedTo)
    f.joined = {
      ...(q.joinedFrom && { $gte: q.joinedFrom }),
      ...(q.joinedTo && { $lte: q.joinedTo }),
    };
  if (q.activeBefore)
    f.$and = [
      { $or: [{ lastActive: '' }, { lastActive: { $lte: `${q.activeBefore}T23:59:59.999Z` } }] },
    ];

  const counts = { all: 0, invited: 0, active: 0, inactive: 0, suspended: 0 } as UserPage['counts'];
  const filter = q.status && q.status !== 'all' ? { ...f, status: q.status } : f;
  // Status counts, the page of rows and the total are independent: one round trip instead of two.
  const [groups, items, total] = await Promise.all([
    c
      .aggregate<{ _id: UserStatus; n: number }>([
        { $match: f },
        { $group: { _id: '$status', n: { $sum: 1 } } },
      ])
      .toArray(),
    c
      .find(filter)
      .sort({ joined: -1, _id: 1 })
      .skip((q.page - 1) * q.pageSize)
      .limit(q.pageSize)
      .toArray(),
    c.countDocuments(filter),
  ]);
  for (const g of groups) {
    counts[g._id] = g.n;
    counts.all += g.n;
  }
  return { items: items.map(toUser), total, counts };
}

export async function getUser(id: string) {
  const d = await (await users()).findOne({ _id: id });
  return d ? toUser(d) : undefined;
}
export async function getUsers(ids: string[]) {
  return (await (await users()).find({ _id: { $in: ids } }).toArray()).map(toUser);
}
export async function emailTaken(email: string) {
  return (await (await users()).countDocuments({ email: email.toLowerCase() }, { limit: 1 })) > 0;
}

async function newInvite(userId: string) {
  const raw = randomBytes(24).toString('hex');
  const c = await invites();
  await c.updateMany({ userId, used: false }, { $set: { used: true } }); // old link dies
  await c.insertOne({
    hash: hash(raw),
    userId,
    exp: new Date(Date.now() + 7 * 86400_000),
    used: false,
  }); // single use, 7 days
  return raw;
}

export async function addUser(i: {
  name: string;
  email: string;
  phone?: string;
  plan: PlanId;
  trialDays: number;
  sendInvite: boolean;
}) {
  const doc: UserDoc = {
    _id: newId('usr'),
    name: i.name,
    email: i.email.toLowerCase(),
    phone: i.phone ?? '',
    plan: i.plan,
    status: 'invited',
    lastActive: '',
    joined: today(),
    mfa: false,
    location: '',
    renewsOn: null,
    lastPasswordChange: null,
  };
  await (await users()).insertOne(doc);
  return { user: toUser(doc), token: await newInvite(doc._id) };
}

export async function resendInvite(id: string) {
  const u = await getUser(id);
  return u && u.status === 'invited' ? newInvite(id) : null;
}

const ALLOWED: Record<UserStatus, UserStatus[]> = {
  invited: [],
  active: ['inactive', 'suspended'],
  inactive: ['active', 'suspended'],
  suspended: ['active'],
};
export async function setUserStatus(
  id: string,
  status: UserStatus,
): Promise<{ before: UserStatus; user: AppUser } | 'invalid' | null> {
  const u = await getUser(id);
  if (!u) return null;
  if (!ALLOWED[u.status].includes(status)) return 'invalid';
  await (await users()).updateOne({ _id: id }, { $set: { status } });
  return { before: u.status, user: { ...u, status } };
}

function nextRenewal(plan: PlanId) {
  const d = new Date();
  d.setMonth(d.getMonth() + (plan === 'pro_yearly' ? 12 : 1));
  return d.toISOString().slice(0, 10);
}
export async function changePlan(id: string, plan: PlanId) {
  const u = await getUser(id);
  if (!u) return null;
  const renewsOn = plan === 'starter' ? null : (u.renewsOn ?? nextRenewal(plan));
  await (await users()).updateOne({ _id: id }, { $set: { plan, renewsOn } });
  return { before: u.plan, user: { ...u, plan, renewsOn } };
}

export async function markPasswordReset(id: string) {
  const r = await (
    await users()
  ).findOneAndUpdate(
    { _id: id },
    { $set: { lastPasswordChange: today() } },
    { returnDocument: 'after' },
  );
  return r ? toUser(r) : undefined;
}

export async function detail(id: string): Promise<UserDetail | null> {
  const u = await getUser(id);
  if (!u) return null;
  const [pay, aud] = await Promise.all([
    col<{ _id: string; at: string; status: 'paid' | 'failed' | 'refunded'; userId?: string }>(
      'payments',
    ).then((c) => c.find({ userId: id }).sort({ at: -1 }).limit(20).toArray()),
    col<{ _id: string; action: string; actor: string; at: string }>('audit').then((c) =>
      c
        .find({ resource: { $regex: esc(id) } })
        .sort({ at: -1 })
        .limit(10)
        .toArray(),
    ),
  ]);
  return {
    ...u,
    usage: null, // product usage lives in the user app's own database
    activity: aud.map((a) => ({
      title: a.action,
      detail: `By ${a.actor}`,
      at: new Date(a.at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }),
    })),
    invoices: pay.map((p) => ({
      id: p._id,
      date: new Date(p.at).toLocaleDateString('en-IN', { dateStyle: 'medium' }),
      status: p.status === 'failed' ? 'failed' : 'paid',
    })),
    sessions: [],
  };
}

export async function updateUser(id: string, p: { name: string; phone: string }) {
  const u = await getUser(id);
  if (!u) return null;
  await (await users()).updateOne({ _id: id }, { $set: { name: p.name, phone: p.phone } });
  return { before: { name: u.name, phone: u.phone }, user: { ...u, ...p } };
}
