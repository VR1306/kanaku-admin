import { afterEach, describe, expect, it, vi } from 'vitest';
import { hasDb, useTestDb } from '@/test/db';
import { col } from '@/lib/db';
import * as ann from './announcements';
import { dispatch, processPending, summaries } from './delivery';
import type { AnnouncementInput } from '@/features/announcements/schemas/announcements';

const user = (id: string, extra: object = {}) => ({
  _id: id,
  name: id,
  email: `${id}@example.com`,
  phone: '',
  plan: 'starter',
  status: 'active',
  lastActive: '',
  joined: '2026-01-01',
  renewsOn: null,
  mfa: false,
  location: '',
  lastPasswordChange: null,
  ...extra,
});
const input = (over: Partial<AnnouncementInput> = {}): AnnouncementInput => ({
  title: 'Hello',
  message: 'World',
  ctaLabel: '',
  ctaHref: '',
  image: null,
  audience: 'all',
  customUserIds: [],
  channels: ['inapp'],
  sendNow: true,
  trigger: 'next_login',
  triggerValue: '',
  frequency: 'once',
  draft: false,
  ...over,
});

describe.skipIf(!hasDb)('announcement delivery', () => {
  useTestDb();
  afterEach(() => vi.unstubAllGlobals());

  it('queues once per user × channel, honours consent, tracks results and is idempotent', async () => {
    process.env.SERVICE_API_KEY = 'k'.repeat(24);
    const users = await col('app_users');
    await users.insertMany([
      user('u_a'),
      user('u_b', { notify: { inApp: false, email: true, push: true, sms: false } }),
      user('u_susp', { status: 'suspended' }),
    ] as never);
    const calls: string[] = [];
    vi.stubGlobal(
      'fetch',
      vi.fn(async (_u: string, init: { body: string }) => {
        calls.push(JSON.parse(init.body).userId);
        return new Response('{}', { status: 200 });
      }),
    );
    const a = await ann.create(input({ channels: ['inapp', 'sms'] }));
    expect(await dispatch(a)).toBe(4); // 2 reachable users × 2 channels (suspended user excluded)
    expect(await dispatch(a)).toBe(0); // idempotent

    expect(await processPending()).toEqual({ sent: 1, failed: 0, skipped: 3 });
    expect(calls).toEqual(['u_a']); // u_b opted out of in-app
    const s = (await summaries([a.id])).get(a.id)!;
    expect(s.byChannel.inapp).toMatchObject({ sent: 1, skipped: 1 });
    expect(s.byChannel.sms.skipped).toBe(2); // no SMS consent / provider
  });

  it('retries transient failures with backoff, then marks failed', async () => {
    process.env.SERVICE_API_KEY = 'k'.repeat(24);
    await (await col('app_users')).insertOne(user('u_r') as never);
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('x', { status: 503 })),
    );
    const a = await ann.create(input({ audience: 'custom', customUserIds: ['u_r'] }));
    await dispatch(a);
    expect(await processPending()).toMatchObject({ sent: 0, failed: 0 });
    const d = await (await col('deliveries')).findOne({ userId: 'u_r' });
    expect(d).toMatchObject({ status: 'pending', attempts: 1 });
    expect(new Date(d!.nextAttempt as Date).getTime()).toBeGreaterThan(Date.now()); // backed off, not hot-looping
    // exhaust the attempts
    for (let i = 0; i < 3; i++) {
      await (
        await col('deliveries')
      ).updateOne({ userId: 'u_r' }, { $set: { nextAttempt: new Date(0) } });
      await processPending();
    }
    expect(await (await col('deliveries')).findOne({ userId: 'u_r' })).toMatchObject({
      status: 'failed',
      attempts: 4,
    });
  });
});
