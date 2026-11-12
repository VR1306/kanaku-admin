import { v1, ApiFault } from '@/lib/v1';
import * as support from '@/services/support';
import { createBody, parse, present } from '@/services/support-user';

/** GET ?userId= — the user's conversations (newest first). */
export const GET = v1({ service: true }, async (req) => {
  const userId = req.nextUrl.searchParams.get('userId');
  if (!userId) throw new ApiFault(400, 'validation', 'userId is required');
  return (await support.list()).filter((t) => t.user.id === userId).map(present);
});

/** POST — start a conversation; staff are alerted in real time. */
export const POST = v1({ service: true }, async (req) => {
  const b = await parse(req, createBody);
  const t = await support.createFromUserMessage({
    subject: b.subject,
    topic: b.topic,
    user: { id: b.userId, name: b.name, plan: b.plan },
    body: b.message,
  });
  return present(t);
});
