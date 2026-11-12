import { describe, expect, it, vi } from 'vitest';
import { col } from '@/lib/db';
import { hasDb, useTestDb } from '@/test/db';
import type { Coupon } from '@/types/admin';

vi.mock('server-only', () => ({}));

const plan = { id: 'plan_pro', name: 'Pro' };
const coupon = (over: Partial<Coupon> = {}): Coupon => ({
  id: 'cp1',
  code: 'SAVE20',
  type: 'percent',
  value: 20,
  plans: ['Pro monthly'],
  duration: 'once',
  from: '2026-01-01',
  until: '2026-12-31',
  maxRedemptions: 10,
  perUser: 1,
  redeemed: 0,
  active: true,
  ...over,
});
const today = '2026-06-01';

describe('couponProblem', () => {
  it('accepts a coupon that is valid for this customer', async () => {
    const { couponProblem } = await import('./coupon-rules');
    expect(couponProblem(coupon(), plan, 0, today)).toBeNull();
    expect(couponProblem(coupon(), plan, null, today)).toBeNull(); // no customer given: per-customer rule skipped
  });
  it('a customer cannot reapply a coupon they already used (once by default)', async () => {
    const { couponProblem } = await import('./coupon-rules');
    expect(couponProblem(coupon(), plan, 1, today)).toBe('You have already used this coupon');
    expect(couponProblem(coupon({ perUser: undefined as never }), plan, 1, today)).toBe(
      'You have already used this coupon',
    );
  });
  it('honours a higher per-customer limit', async () => {
    const { couponProblem } = await import('./coupon-rules');
    const c = coupon({ perUser: 3 });
    expect(couponProblem(c, plan, 2, today)).toBeNull();
    expect(couponProblem(c, plan, 3, today)).toContain('maximum number of times (3)');
  });
  it('still enforces the other rules', async () => {
    const { couponProblem } = await import('./coupon-rules');
    expect(couponProblem(undefined, plan, 0, today)).toContain('not valid');
    expect(couponProblem(coupon({ active: false }), plan, 0, today)).toContain('not active');
    expect(couponProblem(coupon({ until: '2026-05-01' }), plan, 0, today)).toContain('expired');
    expect(couponProblem(coupon({ redeemed: 10 }), plan, 0, today)).toContain('fully redeemed');
    expect(couponProblem(coupon({ plans: ['Starter'] }), plan, 0, today)).toContain(
      'does not apply',
    );
  });
});

describe.skipIf(!hasDb)('per-customer coupon usage', () => {
  useTestDb();
  it('counts paid and refunded uses by that customer only, ignoring failed payments', async () => {
    const { couponUsageByUser } = await import('./coupon-rules');
    const p = await col('payments');
    await p.insertMany([
      { _id: 'p1', userId: 'alice', couponCode: 'SAVE20', status: 'paid' },
      { _id: 'p2', userId: 'alice', couponCode: 'save20', status: 'refunded' }, // case-insensitive; refund doesn't restore it
      { _id: 'p3', userId: 'alice', couponCode: 'SAVE20', status: 'failed' }, // never succeeded: not a use
      { _id: 'p4', userId: 'bob', couponCode: 'SAVE20', status: 'paid' },
      { _id: 'p5', userId: 'alice', status: 'paid' }, // no coupon
    ] as never);
    expect((await couponUsageByUser('alice')).get('SAVE20')).toBe(2);
    expect((await couponUsageByUser('bob')).get('SAVE20')).toBe(1);
    expect((await couponUsageByUser('carol')).size).toBe(0);
  });
});
