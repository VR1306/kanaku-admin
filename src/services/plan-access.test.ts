import { describe, expect, it, vi } from 'vitest';
import {
  defaultMaxBudgetsFor,
  defaultModulesFor,
  USER_MODULE_KEYS,
} from '@/constants/user-modules';
import { planCreate } from '@/features/billing/schemas/billing';
import { hasDb, useTestDb } from '@/test/db';

vi.mock('server-only', () => ({}));

describe('plan access defaults', () => {
  it('Starter excludes recurring and exports and allows 5 budgets; other plans get everything', () => {
    expect(defaultModulesFor('plan_starter')).not.toContain('recurring');
    expect(defaultModulesFor('plan_starter')).not.toContain('exports');
    expect(defaultModulesFor('plan_starter')).toContain('budgets');
    expect(defaultMaxBudgetsFor('plan_starter')).toBe(5);
    expect(defaultModulesFor('plan_pro')).toEqual([...USER_MODULE_KEYS]);
    expect(defaultMaxBudgetsFor('plan_pro')).toBeNull();
  });
  it('rejects unknown modules and non-positive budget limits', () => {
    const base = {
      name: 'Team',
      description: '',
      badge: '',
      visible: true,
      monthly: 10,
      yearly: 100,
      gstPct: 18,
      gstMode: 'exclusive' as const,
    };
    expect(
      planCreate.safeParse({ ...base, modules: ['dashboard', 'budgets'], maxBudgets: 10 }).success,
    ).toBe(true);
    expect(planCreate.safeParse({ ...base, modules: ['admin-panel'] }).success).toBe(false);
    expect(planCreate.safeParse({ ...base, maxBudgets: 0 }).success).toBe(false);
  });
});

describe.skipIf(!hasDb)('plans carry their access rules', () => {
  useTestDb();
  it('a plan saved before access rules existed still gets sensible defaults; an explicit setting wins', async () => {
    const { plans, listPlans } = await import('./billing');
    const legacy = {
      name: 'Starter',
      description: '',
      badge: '',
      visible: true,
      monthly: 0,
      yearly: 0,
      gstPct: 18,
      gstMode: 'exclusive' as const,
      subscribers: 0,
      version: 1,
      status: 'live' as const,
    };
    await plans.insert({ id: 'plan_starter', ...legacy });
    await plans.insert({
      id: 'plan_pro',
      ...legacy,
      name: 'Pro',
      modules: ['dashboard', 'recurring'],
      maxBudgets: 20,
    });
    const all = await listPlans();
    const starter = all.find((p) => p.id === 'plan_starter')!;
    const pro = all.find((p) => p.id === 'plan_pro')!;
    expect(starter.modules).toEqual(defaultModulesFor('plan_starter'));
    expect(starter.maxBudgets).toBe(5);
    expect(pro.modules).toEqual(['dashboard', 'recurring']);
    expect(pro.maxBudgets).toBe(20);
  });
});
