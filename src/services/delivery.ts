import 'server-only';
import { col } from '@/lib/db';
import { ADAPTERS, toDeliveryChannels, type DeliveryChannel } from '@/services/channels';
import type { Announcement } from '@/types/announcements';
import type { AppUser } from '@/types/users';

/**
 * Announcement delivery engine. Publishing creates one delivery record per (user × channel); a worker (`processPending`,
 * driven by the realtime service's tick and by `after()` on publish) sends them, retrying transient failures with backoff.
 * Records end as `sent`, `failed` (retries exhausted) or `skipped` (consent / no token / provider off) — all visible per announcement.
 */
export type DeliveryStatus = 'pending' | 'sent' | 'failed' | 'skipped';
interface DeliveryDoc {
  _id: string; // `${announcementId}:${userId}:${channel}` — makes dispatch idempotent
  announcementId: string;
  userId: string;
  channel: DeliveryChannel;
  status: DeliveryStatus;
  attempts: number;
  nextAttempt: Date;
  error?: string;
  reason?: string;
  at?: string;
}
type UserDoc = Omit<AppUser, 'id'> & { _id: string };
type AnnDoc = Omit<Announcement, 'id'> & { _id: string; dispatchedAt?: string };

const MAX_ATTEMPTS = 4;
const BACKOFF_MS = [60_000, 5 * 60_000, 30 * 60_000];

const deliveries = () => col<DeliveryDoc>('deliveries');

async function recipients(a: Announcement): Promise<UserDoc[]> {
  const users = await col<UserDoc>('app_users');
  const reachable = { status: { $in: ['active', 'inactive'] } };
  const q =
    a.audience === 'custom'
      ? { _id: { $in: a.customUserIds } }
      : a.audience === 'starter'
        ? { ...reachable, plan: 'starter' }
        : a.audience === 'pro'
          ? { ...reachable, plan: { $ne: 'starter' } }
          : a.audience === 'inactive30'
            ? { status: 'inactive' }
            : reachable;
  return users.find(q as never).toArray();
}

/** Claims the announcement (exactly once) and queues its deliveries. Returns how many records were queued. */
export async function dispatch(a: Announcement): Promise<number> {
  const anns = await col<AnnDoc>('announcements');
  const claim = await anns.updateOne(
    { _id: a.id, dispatchedAt: { $exists: false } },
    { $set: { dispatchedAt: new Date().toISOString() } },
  );
  if (!claim.modifiedCount) return 0;
  const channels = toDeliveryChannels(a.channels);
  const users = await recipients(a);
  const now = new Date();
  const docs: DeliveryDoc[] = users.flatMap((u) =>
    channels.map((channel) => ({
      _id: `${a.id}:${u._id}:${channel}`,
      announcementId: a.id,
      userId: u._id,
      channel,
      status: 'pending' as const,
      attempts: 0,
      nextAttempt: now,
    })),
  );
  if (docs.length) await (await deliveries()).insertMany(docs, { ordered: false }).catch(() => {});
  return docs.length;
}

/** Sends due deliveries. Safe to run concurrently: each record is claimed atomically. */
export async function processPending(
  limit = 100,
): Promise<{ sent: number; failed: number; skipped: number }> {
  const store = await deliveries();
  const out = { sent: 0, failed: 0, skipped: 0 };
  const users = new Map<string, UserDoc | null>();
  const anns = new Map<string, Announcement | null>();
  for (let i = 0; i < limit; i++) {
    const d = await store.findOneAndUpdate(
      { status: 'pending', nextAttempt: { $lte: new Date() } },
      { $set: { nextAttempt: new Date(Date.now() + 120_000) } }, // lease: a crashed worker's record reappears after 2 min
      { sort: { nextAttempt: 1 }, returnDocument: 'after' },
    );
    if (!d) break;
    if (!users.has(d.userId))
      users.set(d.userId, await (await col<UserDoc>('app_users')).findOne({ _id: d.userId }));
    if (!anns.has(d.announcementId)) {
      const a = await (await col<AnnDoc>('announcements')).findOne({ _id: d.announcementId });
      anns.set(d.announcementId, a ? { ...a, id: a._id } : null);
    }
    const u = users.get(d.userId);
    const a = anns.get(d.announcementId);
    const at = new Date().toISOString();
    if (!u || !a) {
      await store.updateOne(
        { _id: d._id },
        { $set: { status: 'skipped', reason: 'recipient or announcement removed', at } },
      );
      out.skipped++;
      continue;
    }
    try {
      const r = await ADAPTERS[d.channel]({ ...u, id: d.userId }, a);
      if ('ok' in r) {
        await store.updateOne(
          { _id: d._id },
          { $set: { status: 'sent', at }, $inc: { attempts: 1 }, $unset: { error: '' } },
        );
        out.sent++;
      } else {
        await store.updateOne({ _id: d._id }, { $set: { status: 'skipped', reason: r.skip, at } });
        out.skipped++;
      }
    } catch (e) {
      const attempts = d.attempts + 1;
      const done = attempts >= MAX_ATTEMPTS;
      await store.updateOne(
        { _id: d._id },
        {
          $set: {
            status: done ? 'failed' : 'pending',
            attempts,
            error: (e as Error).message.slice(0, 200),
            nextAttempt: new Date(Date.now() + (BACKOFF_MS[attempts - 1] ?? BACKOFF_MS.at(-1)!)),
            at,
          },
        },
      );
      if (done) out.failed++;
    }
  }
  return out;
}

/** Publishes scheduled announcements that have come due, then sends whatever is pending. Called every ~30 s. */
export async function tick() {
  const now = new Date().toISOString();
  const due = await (
    await col<AnnDoc>('announcements')
  )
    .find({
      draft: false,
      dispatchedAt: { $exists: false },
      publishAt: { $lte: now },
      $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }],
    })
    .toArray();
  let queued = 0;
  for (const d of due) queued += await dispatch({ ...d, id: d._id });
  return { dispatched: due.length, queued, ...(await processPending()) };
}

export type DeliverySummary = Record<DeliveryStatus, number> & {
  byChannel: Record<string, Record<DeliveryStatus, number>>;
};
const blank = (): Record<DeliveryStatus, number> => ({
  pending: 0,
  sent: 0,
  failed: 0,
  skipped: 0,
});

export async function summaries(ids: string[]): Promise<Map<string, DeliverySummary>> {
  const rows = ids.length
    ? await (
        await deliveries()
      )
        .aggregate<{ _id: { a: string; c: string; s: DeliveryStatus }; n: number }>([
          { $match: { announcementId: { $in: ids } } },
          {
            $group: { _id: { a: '$announcementId', c: '$channel', s: '$status' }, n: { $sum: 1 } },
          },
        ])
        .toArray()
    : [];
  const map = new Map<string, DeliverySummary>();
  for (const { _id, n } of rows) {
    const s = map.get(_id.a) ?? { ...blank(), byChannel: {} };
    s[_id.s] += n;
    (s.byChannel[_id.c] ??= blank())[_id.s] += n;
    map.set(_id.a, s);
  }
  return map;
}
