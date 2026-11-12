import { afterAll } from 'vitest';

/** Integration tests run against a throwaway database on the configured cluster, dropped afterwards. */
export const hasDb = !!process.env.MONGODB_URI;
export function useTestDb() {
  process.env.MONGODB_DB = `kanaku_admin_test_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
  afterAll(async () => {
    const { getDb } = await import('@/lib/db');
    await (await getDb()).dropDatabase();
  });
}
