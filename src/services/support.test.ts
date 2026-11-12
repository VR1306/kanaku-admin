import { describe, expect, it } from 'vitest';
import { hasDb, useTestDb } from '@/test/db';
import {
  createFromUserMessage,
  customerCanReply,
  get,
  post,
  postFromUser,
  save,
  setStatus,
  userView,
} from './support';
import { acceptInvite, activate, inviteMember, registerSession } from './identity';
import { createRole } from './roles';

const user = { id: 'u1', name: 'Test User', plan: 'Starter' };
const mk = (topic: string) => createFromUserMessage({ subject: 's', topic, user, body: 'b' });

describe.skipIf(!hasDb)('support', () => {
  useTestDb();
  it('billing tickets default to High priority; others Medium; ids increment', async () => {
    const a = await mk('Billing');
    const b = await mk('General');
    expect(a.priority).toBe('high');
    expect(b.priority).toBe('medium');
    expect(Number(b.id.slice(1))).toBe(Number(a.id.slice(1)) + 1);
  });
  it('queues when no agent is online, assigns the least-busy online agent otherwise', async () => {
    const queued = await mk('General');
    expect(queued.assignee).toBeNull();
    expect(queued.messages.some((m) => m.body.includes('No agents are online'))).toBe(true);
    const role = await createRole('Agent QA', ['support.manage']);
    const { token, account } = await inviteMember({
      name: 'Farhan',
      email: 'farhan@kanaku.com',
      role: role.id,
    });
    await acceptInvite(token, 'Str0ng!Pass');
    await activate(account.id);
    await registerSession(account.id, 's-farhan', 'd', 'ip');
    const t = await mk('General');
    expect(t.assigneeName).toBe('Farhan');
  });
  it('internal notes never appear in the user view', async () => {
    const t = (await get((await mk('General')).id))!;
    post(t, { body: 'secret note', internal: true, author: 'Priya' });
    await save(t);
    const again = (await get(t.id))!;
    expect(userView(again).messages.some((m) => m.body === 'secret note')).toBe(false);
    expect(again.firstResponseAt).toBeNull(); // internal notes don't count as a response
  });
  it('closed tickets are final; resolved can be reopened', async () => {
    const t = await mk('General');
    expect(setStatus(t, 'resolved')).toBe('ok');
    expect(setStatus(t, 'open')).toBe('ok');
    setStatus(t, 'resolved');
    setStatus(t, 'closed');
    expect(setStatus(t, 'open')).toBe('invalid');
  });
  it('once resolved (or closed) the customer cannot message; an agent reopening restores it', async () => {
    const t = await mk('General');
    expect(customerCanReply(t)).toBe(true);
    expect(await postFromUser(t, 'follow-up while open')).toBe(true);

    setStatus(t, 'resolved');
    await save(t);
    const before = (await get(t.id))!.messages.length;
    expect(customerCanReply(t)).toBe(false);
    expect(await postFromUser(t, 'message after resolution')).toBe(false);
    expect((await get(t.id))!.messages.length).toBe(before); // nothing was stored

    setStatus(t, 'closed');
    expect(await postFromUser(t, 'message after closing')).toBe(false);

    setStatus(t, 'open'); // invalid from closed
    const r = (await get(t.id))!;
    setStatus(r, 'open'); // resolved was saved earlier, so this reopens from 'resolved'
    await save(r);
    expect(await postFromUser(r, 'back again')).toBe(true);
  });
});
