import 'server-only';
import { permissionsFor } from '@/services/roles';
import { listMembers, listOnlineMemberIds } from '@/services/identity';
import type { Attachment, Message, Priority, Ticket, TicketStatus } from '@/types/support';
import { randomBytes } from 'node:crypto';
import { col } from '@/lib/db';
import { emitRealtime } from '@/lib/realtime';
import { sendNewTicketAlert } from '@/lib/mailer';
import { notifyAdmins } from '@/services/notifications';
import { pushNotification } from '@/services/user-app';

// Support tickets (MongoDB `tickets`, ids from a `counters` sequence). Real-time transport: the UI polls these
// endpoints; a WebSocket gateway needs a long-lived server that Next route handlers can't host — see docs/API_INTEGRATION.md.
type TicketDoc = Omit<Ticket, 'id'> & { _id: string };
const tickets = () => col<TicketDoc>('tickets');
const toTicket = ({ _id, ...rest }: TicketDoc): Ticket => ({ id: _id, ...rest });
const now = () => Date.now();
const msg = (
  from: Message['from'],
  body: string,
  at: string,
  author: string,
  extra: Partial<Message> = {},
): Message => ({
  id: `m_${randomBytes(4).toString('hex')}`,
  from,
  internal: false,
  body,
  at,
  author,
  ...extra,
});

async function nextTicketId() {
  const r = await (
    await col<{ _id: string; seq: number }>('counters')
  ).findOneAndUpdate(
    { _id: 'ticket' },
    { $inc: { seq: 1 } },
    { upsert: true, returnDocument: 'after' },
  );
  return `#${1000 + (r?.seq ?? 1)}`;
}

/** Tickets close automatically 7 days after resolution (applied lazily on read). */
let lastSweep = 0;
async function sweep() {
  if (Date.now() - lastSweep < 60_000) return; // a bulk write on every read costs a round trip for nothing
  lastSweep = Date.now();
  await (
    await tickets()
  ).updateMany(
    { status: 'resolved', resolvedAt: { $lt: new Date(now() - 7 * 86400_000).toISOString() } },
    { $set: { status: 'closed' } },
  );
}

export const QUICK_REPLIES = [
  'Thanks for reaching out — I’m looking into this now.',
  'I’ve refunded the duplicate charge. It reaches your account in 5–7 working days.',
  'Could you share a screenshot so we can investigate?',
  'Marking this as resolved — reply here within 7 days if you need more help.',
];

/** Open (not resolved/closed) tickets: a count, not a download of every conversation. */
export async function openCount(): Promise<number> {
  return (await tickets()).countDocuments({ status: { $nin: ['resolved', 'closed'] } });
}

/** Ticket fields the dashboard needs (no message bodies). */
export type TicketLite = Pick<Ticket, 'id' | 'status' | 'createdAt' | 'firstResponseAt'>;
export async function listLight(): Promise<TicketLite[]> {
  return (
    await (
      await tickets()
    )
      .find({}, { projection: { status: 1, createdAt: 1, firstResponseAt: 1 } })
      .toArray()
  ).map(({ _id, ...r }) => ({ id: _id, ...r }) as TicketLite);
}

export async function list(limit = 300): Promise<Ticket[]> {
  await sweep();
  // Newest first, bounded: the inbox never needs years of resolved history on every refresh.
  return (await (await tickets()).find().sort({ createdAt: -1 }).limit(limit).toArray()).map(
    toTicket,
  );
}
export async function get(id: string): Promise<Ticket | undefined> {
  await sweep();
  const d = await (await tickets()).findOne({ _id: id });
  return d ? toTicket(d) : undefined;
}
/** Persists a ticket after one of the mutators below changed it. */
export async function save(t: Ticket) {
  const { id, ...rest } = t;
  await (await tickets()).replaceOne({ _id: id }, rest as Omit<Ticket, 'id'>, { upsert: true });
  await broadcast(t);
  return t;
}

export const unreadFor = (t: Ticket, side: 'user' | 'agent') =>
  t.messages.filter(
    (m) => !m.internal && m.from === (side === 'user' ? 'agent' : 'user') && !m.readAt,
  ).length;

/** Tells every connected party (staff + the ticket's owner) that the conversation changed. Internal notes never reach the user. */
async function broadcast(t: Ticket) {
  const pub = t.messages.filter((m) => !m.internal);
  const base = { ticketId: t.id, status: t.status, updatedAt: new Date().toISOString() };
  await Promise.all([
    emitRealtime(['agents'], 'chat:updated', {
      ...base,
      last: t.messages.at(-1) ?? null,
      unread: unreadFor(t, 'agent'),
    }),
    emitRealtime([`user:${t.user.id}`], 'chat:updated', {
      ...base,
      last: pub.at(-1) ?? null,
      unread: unreadFor(t, 'user'),
    }),
  ]);
}

/** A resolved or closed conversation no longer accepts messages from the customer (an agent can reopen it). */
export const customerCanReply = (t: Pick<Ticket, 'status'>) =>
  t.status !== 'resolved' && t.status !== 'closed';

/** A message typed by the end user (from the User App). Returns false, and stores nothing, if the ticket is resolved. */
export async function postFromUser(t: Ticket, body: string): Promise<boolean> {
  if (!customerCanReply(t)) return false;
  const at = new Date().toISOString();
  t.messages.push(msg('user', body, at, t.user.name));
  if (t.status === 'waiting') t.status = t.assignee ? 'assigned' : 'open';
  t.typing = undefined;
  await save(t);
  await alertStaff(t, `New message from ${t.user.name}`, body);
  return true;
}

/** Tells the user in their notification centre that support replied (best effort: the live chat already updated). */
export async function notifyUser(t: Ticket, text: string) {
  try {
    await pushNotification({
      userId: t.user.id,
      kind: 'support',
      title: `Support replied to ${t.id}`,
      body: text.length > 140 ? `${text.slice(0, 137)}…` : text,
      href: '/help',
      dedupeKey: `reply:${t.id}:${t.messages.at(-1)?.id ?? Date.now()}`,
    });
  } catch (e) {
    console.error('[support] could not notify the user app', (e as Error).message);
  }
}

/** E-mails the assigned agent (or every eligible agent when unassigned) plus the shared SUPPORT_EMAIL, once per new ticket. */
export async function emailStaffNewTicket(t: Ticket, body: string) {
  try {
    const wanted = new Set<string>();
    if (process.env.SUPPORT_EMAIL) wanted.add(process.env.SUPPORT_EMAIL.trim().toLowerCase());
    const ids = new Set(t.assignee ? [t.assignee] : (await agents()).map((a) => a.id));
    for (const m of await listMembers()) if (ids.has(m.id)) wanted.add(m.email.toLowerCase());
    // ADMIN_URL if set; otherwise Vercel's automatic production domain; otherwise just a relative link.
    const base = (
      process.env.ADMIN_URL ??
      (process.env.VERCEL_PROJECT_PRODUCTION_URL
        ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
        : '')
    ).replace(/\/$/, '');
    const consoleUrl = `${base}/support?ticket=${encodeURIComponent(t.id)}`;
    await Promise.all(
      [...wanted].map((to) =>
        sendNewTicketAlert(to, {
          id: t.id,
          subject: t.subject,
          topic: t.topic,
          userName: t.user.name,
          plan: t.user.plan,
          message: body,
          consoleUrl,
        }),
      ),
    );
  } catch (e) {
    console.error('[support] new-ticket email failed', (e as Error).message);
  }
}

/** Notifies the assignee, or every online-eligible agent when nobody owns the ticket. */
export async function alertStaff(t: Ticket, title: string, body: string) {
  const ids = t.assignee ? [t.assignee] : (await agents()).map((a) => a.id);
  await notifyAdmins(ids, {
    kind: 'support',
    title,
    body: body.length > 140 ? `${body.slice(0, 137)}…` : body,
    href: `/support?ticket=${encodeURIComponent(t.id)}`,
  });
}

/** Marks the other side's messages as delivered/read and tells the sender (message status ticks). */
export async function markSeen(t: Ticket, by: 'user' | 'agent', kind: 'delivered' | 'read') {
  const from = by === 'user' ? 'agent' : 'user';
  const at = new Date().toISOString();
  let changed = false;
  for (const m of t.messages) {
    if (m.internal || m.from !== from) continue;
    if (!m.deliveredAt) {
      m.deliveredAt = at;
      changed = true;
    }
    if (kind === 'read' && !m.readAt) {
      m.readAt = at;
      changed = true;
    }
  }
  if (changed) await save(t);
  return changed;
}

/** Eligible agents: active members whose role grants support.manage. Online = has a live device session. */
export async function agents() {
  const [members, open] = await Promise.all([
    listMembers(),
    (await tickets())
      .aggregate<{ _id: string; n: number }>([
        { $match: { assignee: { $ne: null }, status: { $nin: ['resolved', 'closed'] } } },
        { $group: { _id: '$assignee', n: { $sum: 1 } } },
      ])
      .toArray(),
  ]);
  const active = members.filter((m) => m.status === 'active');
  // Permissions are cached per role and sessions come from one query (this used to be 2 round trips per member).
  const [eligible, online] = await Promise.all([
    Promise.all(active.map(async (m) => (await permissionsFor(m.role)).includes('support.manage'))),
    listOnlineMemberIds(active.map((m) => m.id)),
  ]);
  return active
    .filter((_, i) => eligible[i])
    .map((m) => ({
      id: m.id,
      name: m.name,
      online: online.has(m.id),
      open: open.find((o) => o._id === m.id)?.n ?? 0,
    }));
}

export const firstName = (full: string) => full.trim().split(/\s+/)[0] ?? full;

/** Who a customer can chat with right now: eligible agents that have a live console session (first names only). */
export async function availability() {
  const online = (await agents()).filter((a) => a.online);
  return {
    online: online.length > 0,
    count: online.length,
    agents: online.slice(0, 3).map((a) => ({ name: firstName(a.name) })),
  };
}

/** Least-busy available (online) eligible agent, or null → ticket stays queued. */
export async function pickAgent() {
  const online = (await agents()).filter((a) => a.online).sort((a, b) => a.open - b.open);
  return online[0] ?? null;
}

/** Called when a user sends their first support message (user app → intake). Billing defaults to High priority. */
export async function createFromUserMessage(i: {
  subject: string;
  topic: string;
  user: Ticket['user'];
  body: string;
}): Promise<Ticket> {
  const priority: Priority = i.topic === 'Billing' ? 'high' : 'medium';
  const a = await pickAgent();
  const t: Ticket = {
    id: await nextTicketId(),
    subject: i.subject,
    topic: i.topic,
    user: i.user,
    status: a ? 'assigned' : 'open',
    priority,
    assignee: a?.id ?? null,
    assigneeName: a?.name ?? null,
    createdAt: new Date().toISOString(),
    firstResponseAt: null,
    resolvedAt: null,
    rating: null,
    messages: [],
  };
  t.messages.push(
    msg(
      'system',
      `Ticket ${t.id} created automatically · ${i.topic} · ${priority} priority`,
      t.createdAt,
      'System',
    ),
  );
  if (!a)
    t.messages.push(
      msg(
        'system',
        'No agents are online. We’ll reply by email — usually within 4 hours.',
        t.createdAt,
        'System',
      ),
    );
  t.messages.push(msg('user', i.body, t.createdAt, i.user.name));
  await save(t);
  await alertStaff(t, `New ${i.topic} ticket from ${i.user.name}`, i.body);
  await emailStaffNewTicket(t, i.body); // never throws: a mail problem must not fail the customer's request
  return t;
}

export const slaBreached = (t: Pick<Ticket, 'status' | 'createdAt' | 'firstResponseAt'>) =>
  !t.firstResponseAt &&
  !['resolved', 'closed'].includes(t.status) &&
  now() - new Date(t.createdAt).getTime() > 4 * 3600_000;

export function post(
  t: Ticket,
  m: { body: string; internal: boolean; author: string; attachments?: Attachment[] },
) {
  const at = new Date().toISOString();
  t.messages.push(
    msg('agent', m.body, at, m.author, { internal: m.internal, attachments: m.attachments }),
  );
  if (!m.internal) {
    if (!t.firstResponseAt) t.firstResponseAt = at;
    if (t.status === 'open' || t.status === 'assigned') t.status = 'waiting';
  }
  t.typing = undefined;
  return t;
}

export function setStatus(t: Ticket, s: TicketStatus): 'ok' | 'invalid' {
  const allowed: Record<TicketStatus, TicketStatus[]> = {
    open: ['assigned', 'waiting', 'resolved'],
    assigned: ['open', 'waiting', 'resolved'],
    waiting: ['assigned', 'resolved', 'open'],
    resolved: ['open', 'closed'],
    closed: [],
  };
  if (!allowed[t.status].includes(s)) {
    // Users can reopen a resolved ticket within 7 days — handled by the 'resolved → open' transition above; closed is final.
    return 'invalid';
  }
  t.status = s;
  t.resolvedAt = s === 'resolved' ? new Date().toISOString() : s === 'open' ? null : t.resolvedAt;
  return 'ok';
}

export async function assign(t: Ticket, agentId: string | null) {
  const a = agentId ? (await agents()).find((x) => x.id === agentId) : null;
  t.assignee = a?.id ?? null;
  t.assigneeName = a?.name ?? null;
  if (a && t.status === 'open') t.status = 'assigned';
  if (!a && t.status === 'assigned') t.status = 'open';
  return a ?? null;
}

/** What a *user* may see: internal notes are always stripped. */
export const userView = (t: Ticket): Ticket => ({
  ...structuredClone(t),
  messages: t.messages.filter((m) => !m.internal),
});
