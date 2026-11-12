import 'server-only';
import { col, newId } from '@/lib/db';
import { istToUtc, type AnnouncementInput } from '@/features/announcements/schemas/announcements';
import { summaries } from '@/services/delivery';
import type { Announcement, AnnouncementRow, AnnStatus } from '@/types/announcements';

// Announcements (MongoDB `announcements`). Reach is computed from the live user directory.
type Doc = Omit<Announcement, 'id'> & { _id: string };
const coll = () => col<Doc>('announcements');
const toAnn = ({ _id, ...rest }: Doc): Announcement => ({ id: _id, ...rest });

/** Status is derived from time so scheduled → live → expired happens automatically (expired items stop displaying). */
export function status(a: Announcement, at = Date.now()): AnnStatus {
  if (a.draft) return 'draft';
  if (a.expiresAt && new Date(a.expiresAt).getTime() <= at) return 'expired';
  if (a.publishAt && new Date(a.publishAt).getTime() > at) return 'scheduled';
  return 'live';
}

type Reach = { all: number; starter: number; pro: number; inactive30: number };
async function reachTable(): Promise<Reach> {
  const g = await (
    await col<{ _id: string }>('app_users')
  )
    .aggregate<{ _id: { plan: string; status: string }; n: number }>([
      { $group: { _id: { plan: '$plan', status: '$status' }, n: { $sum: 1 } } },
    ])
    .toArray();
  const r: Reach = { all: 0, starter: 0, pro: 0, inactive30: 0 };
  for (const { _id, n } of g) {
    r.all += n;
    if (_id.plan === 'starter') r.starter += n;
    else r.pro += n;
    if (_id.status === 'inactive') r.inactive30 += n;
  }
  return r;
}
const reachFrom = (a: Announcement, t: Reach) =>
  a.audience === 'custom' ? a.customUserIds.length : t[a.audience];
export async function reachOf(a: Announcement) {
  return reachFrom(a, await reachTable());
}
export async function row(a: Announcement): Promise<AnnouncementRow> {
  const [reach, d] = await Promise.all([reachOf(a), summaries([a.id])]);
  return { ...a, status: status(a), reach, delivery: d.get(a.id) ?? null };
}
export async function list(): Promise<AnnouncementRow[]> {
  const [docs, t] = await Promise.all([
    coll().then((c) => c.find().sort({ createdAt: -1 }).toArray()),
    reachTable(),
  ]);
  const d = await summaries(docs.map((x) => x._id));
  return docs.map(toAnn).map((a) => ({
    ...a,
    status: status(a),
    reach: reachFrom(a, t),
    delivery: d.get(a.id) ?? null,
  }));
}
export async function get(id: string) {
  const d = await (await coll()).findOne({ _id: id });
  return d ? toAnn(d) : undefined;
}

function build(i: AnnouncementInput, id: string, prev?: Announcement): Announcement {
  return {
    id,
    title: i.title,
    message: i.message,
    ctaLabel: i.ctaLabel,
    ctaHref: i.ctaHref,
    image: i.image,
    audience: i.audience,
    customUserIds: i.customUserIds,
    channels: i.channels,
    sendNow: i.sendNow,
    publishAt: i.draft
      ? null
      : i.sendNow
        ? new Date().toISOString()
        : istToUtc(i.publishDate!, i.publishTime!),
    expiresAt: i.expiryDate && i.expiryTime ? istToUtc(i.expiryDate, i.expiryTime) : null,
    trigger: i.trigger,
    triggerValue: i.triggerValue,
    frequency: i.frequency,
    draft: i.draft,
    createdAt: prev?.createdAt ?? new Date().toISOString(),
    openRatePct: prev?.openRatePct ?? null,
  };
}
const put = async (a: Announcement) => {
  const { id, ...rest } = a;
  await (await coll()).replaceOne({ _id: id }, rest, { upsert: true });
  return a;
};
export const create = (i: AnnouncementInput) => put(build(i, newId('an')));
export async function update(id: string, i: AnnouncementInput) {
  const prev = await get(id);
  if (!prev) return null;
  const s = status(prev);
  if (s === 'live' || s === 'expired') return 'locked' as const; // only drafts and scheduled items can be edited
  return put(build(i, id, prev));
}
export async function cancel(id: string) {
  const a = await get(id);
  if (!a || status(a) !== 'scheduled') return null;
  return put({ ...a, draft: true, publishAt: null });
}
