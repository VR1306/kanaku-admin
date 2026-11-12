import { beforeAll, describe, expect, it } from 'vitest';
import { hasDb, useTestDb } from '@/test/db';
import { addUser, changePlan, getUser, listUsers, resendInvite, setUserStatus } from './users';
import { col } from '@/lib/db';

describe.skipIf(!hasDb)('users service', () => {
  useTestDb();
  let activeId: string;
  beforeAll(async () => {
    activeId = (
      await addUser({
        name: 'Active One',
        email: 'active@example.com',
        plan: 'starter',
        trialDays: 0,
        sendInvite: true,
      })
    ).user.id;
    await (
      await col('app_users')
    ).updateOne({ _id: activeId } as never, { $set: { status: 'active' } });
  });
  it('starts empty-safe and filters by status with counts', async () => {
    const all = await listUsers({ page: 1, pageSize: 50 });
    expect(all.counts.all).toBe(all.total);
    const p = await listUsers({ status: 'invited', page: 1, pageSize: 50 });
    expect(p.items.every((u) => u.status === 'invited')).toBe(true);
    expect(p.counts.all).toBeGreaterThanOrEqual(p.counts.invited);
  });
  it('new users start as Invited; resending invalidates the old link', async () => {
    const { user } = await addUser({
      name: 'Zed Test',
      email: 'zed@example.com',
      plan: 'starter',
      trialDays: 0,
      sendInvite: true,
    });
    expect(user.status).toBe('invited');
    expect(typeof (await resendInvite(user.id))).toBe('string');
    expect(await resendInvite(activeId)).toBeNull(); // active users can't be re-invited
  });
  it('enforces status transitions', async () => {
    const inv = (
      await addUser({
        name: 'Inv',
        email: 'inv@example.com',
        plan: 'starter',
        trialDays: 0,
        sendInvite: true,
      })
    ).user;
    expect(await setUserStatus(inv.id, 'suspended')).toBe('invalid'); // invited can't be suspended
    expect(await setUserStatus(activeId, 'suspended')).toMatchObject({ before: 'active' });
    expect(await setUserStatus(activeId, 'active')).toMatchObject({ before: 'suspended' });
  });
  it('changes plan and sets a renewal date', async () => {
    expect(await changePlan(activeId, 'pro_monthly')).toMatchObject({ before: 'starter' });
    expect((await getUser(activeId))?.renewsOn).toBeTruthy();
  });
});
