import 'server-only';

/**
 * Tiny per-process TTL map for hot, rarely-changing lookups (role permissions, "is this device session still valid").
 * Each Atlas round trip costs ~50 ms, so removing a lookup from every request is the cheapest speed-up there is.
 * Writers call `clear()` so edits apply at once on this instance; other instances catch up within `ttlMs`.
 */
export function ttlCache<V>(ttlMs: number, max = 500) {
  const m = new Map<string, { v: V; exp: number }>();
  return {
    get(k: string): V | undefined {
      const e = m.get(k);
      if (!e) return undefined;
      if (e.exp < Date.now()) {
        m.delete(k);
        return undefined;
      }
      return e.v;
    },
    set(k: string, v: V) {
      if (m.size >= max) m.delete(m.keys().next().value as string);
      m.set(k, { v, exp: Date.now() + ttlMs });
    },
    delete: (k: string) => void m.delete(k),
    clear: () => m.clear(),
  };
}
