import { describe, expect, it, vi } from 'vitest';
import { hasDb, useTestDb } from '@/test/db';
import type { Ticket } from '@/types/support';

vi.mock('server-only', () => ({}));

const ticket = (over: Partial<Ticket> = {}): Ticket => ({
  id: '#1042',
  subject: 's',
  topic: 'Billing',
  user: { id: 'u1', name: 'Cust Omer', plan: 'starter' },
  status: 'assigned',
  priority: 'high',
  assignee: 'adm_1',
  assigneeName: 'Priya Venkataraman',
  createdAt: '2026-11-12T10:00:00.000Z',
  firstResponseAt: null,
  resolvedAt: null,
  rating: null,
  messages: [
    {
      id: 'm1',
      from: 'user',
      internal: false,
      body: 'hi',
      at: '2026-11-12T10:00:00.000Z',
      author: 'Cust Omer',
    },
    {
      id: 'm2',
      from: 'agent',
      internal: false,
      body: 'hello',
      at: '2026-11-12T10:01:00.000Z',
      author: 'Priya Venkataraman',
    },
    {
      id: 'm3',
      from: 'agent',
      internal: true,
      body: 'secret note',
      at: '2026-11-12T10:02:00.000Z',
      author: 'Priya Venkataraman',
    },
  ],
  ...over,
});

describe('what a customer sees of a ticket', () => {
  it('shows the agent by first name only and never leaks internal notes', async () => {
    const { present } = await import('./support-user');
    const v = present(ticket());
    expect(v.agent).toEqual({ name: 'Priya', online: false });
    expect(v.messages.map((m) => m.author)).toEqual(['Cust Omer', 'Priya']);
    expect(JSON.stringify(v)).not.toContain('secret note');
    expect(JSON.stringify(v)).not.toContain('Venkataraman');
    expect(present(ticket({ assignee: null, assigneeName: null })).agent).toBeNull();
  });
});

describe.skipIf(!hasDb)('live-chat availability', () => {
  useTestDb();
  it('reports offline when no eligible agent is signed in', async () => {
    const { availability } = await import('./support');
    expect(await availability()).toEqual({ online: false, count: 0, agents: [] });
  });
});
