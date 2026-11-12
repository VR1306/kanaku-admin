import 'server-only';
import { col, newId } from '@/lib/db';
import { emitRealtime } from '@/lib/realtime';

/** In-console notifications for team members (new support messages, assignments, …). Pushed live through the realtime service. */
export interface AdminNotification {
  id: string;
  userId: string; // admin member id
  kind: 'support' | 'system';
  title: string;
  body: string;
  href: string | null;
  at: string;
  read: boolean;
}
type Doc = Omit<AdminNotification, 'id'> & { _id: string };
const store = () => col<Doc>('admin_notifications');
const toApi = ({ _id, ...r }: Doc): AdminNotification => ({ id: _id, ...r });

export async function notifyAdmins(
  adminIds: string[],
  n: Pick<AdminNotification, 'kind' | 'title' | 'body' | 'href'>,
) {
  const at = new Date().toISOString();
  const docs: Doc[] = [...new Set(adminIds)].map((userId) => ({
    _id: newId('an'),
    userId,
    ...n,
    at,
    read: false,
  }));
  if (!docs.length) return;
  await (await store()).insertMany(docs);
  await Promise.all(
    docs.map((d) => emitRealtime([`admin:${d.userId}`], 'notification:new', toApi(d))),
  );
}

export async function listFor(userId: string, limit = 30) {
  const s = await store();
  const [rows, unread] = await Promise.all([
    s.find({ userId }).sort({ at: -1 }).limit(limit).toArray(),
    s.countDocuments({ userId, read: false }),
  ]);
  return { items: rows.map(toApi), unread };
}

export async function markRead(userId: string, id?: string) {
  await (
    await store()
  ).updateMany({ userId, read: false, ...(id ? { _id: id } : {}) }, { $set: { read: true } });
  await emitRealtime([`admin:${userId}`], 'notification:read', { id: id ?? null });
}
