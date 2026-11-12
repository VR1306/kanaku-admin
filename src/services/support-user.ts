import 'server-only';
import { z } from 'zod';
import { ApiFault } from '@/lib/v1';
import * as support from '@/services/support';
import type { Ticket } from '@/types/support';

/** The user-facing slice of the support module (called server-to-server by the User App). */
export const userRef = z.object({ userId: z.string().min(1).max(80) });
export const createBody = userRef.extend({
  name: z.string().min(1).max(80),
  plan: z.string().max(40).default('starter'),
  topic: z.string().min(1).max(40),
  subject: z.string().trim().min(1).max(120),
  message: z.string().trim().min(1).max(4000),
});
export const messageBody = userRef.extend({ message: z.string().trim().min(1).max(4000) });
export const readBody = userRef.extend({ kind: z.enum(['delivered', 'read']).default('read') });
export const resolveBody = userRef.extend({ rating: z.number().int().min(1).max(5).optional() });

export const normaliseId = (raw: string) => {
  const d = decodeURIComponent(raw);
  return /^\d+$/.test(d) ? `#${d}` : d;
};

export async function ownedTicket(rawId: string, userId: string): Promise<Ticket> {
  const t = await support.get(normaliseId(rawId));
  if (!t || t.user.id !== userId) throw new ApiFault(404, 'not_found', 'Conversation not found');
  return t;
}

/**
 * What the customer sees: an explicit allow-list (never the internal assignee id, the agent's full name,
 * priority, or internal notes), the agent's first name only, and a ticket number.
 */
export const present = (t: Ticket) => {
  const v = support.userView(t);
  return {
    id: t.id,
    number: Number(t.id.replace('#', '')),
    subject: t.subject,
    topic: t.topic,
    status: t.status,
    createdAt: t.createdAt,
    firstResponseAt: t.firstResponseAt,
    resolvedAt: t.resolvedAt,
    rating: t.rating,
    unread: support.unreadFor(t, 'user'),
    agent: t.assigneeName ? { name: support.firstName(t.assigneeName), online: false } : null,
    messages: v.messages.map((m) => ({
      id: m.id,
      from: m.from,
      body: m.body,
      at: m.at,
      author: m.from === 'agent' ? support.firstName(m.author) : m.author,
      deliveredAt: m.deliveredAt,
      readAt: m.readAt,
    })),
  };
};

export async function parse<T>(req: Request, schema: z.ZodType<T>): Promise<T> {
  const r = schema.safeParse(await req.json().catch(() => null));
  if (!r.success)
    throw new ApiFault(400, 'validation', r.error.issues[0]?.message ?? 'Invalid body');
  return r.data;
}
