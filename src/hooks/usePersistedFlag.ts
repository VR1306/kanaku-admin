'use client';

import { useCallback, useSyncExternalStore } from 'react';

const EVENT = 'kanaku-admin:flag';

/** Boolean kept in localStorage. Server render and first paint use `fallback`. */
export function usePersistedFlag(key: string, fallback = false) {
  const subscribe = useCallback((notify: () => void) => {
    window.addEventListener(EVENT, notify);
    window.addEventListener('storage', notify);
    return () => {
      window.removeEventListener(EVENT, notify);
      window.removeEventListener('storage', notify);
    };
  }, []);
  const read = useCallback(() => {
    try {
      const r = localStorage.getItem(key);
      return r === null ? fallback : r === '1';
    } catch {
      return fallback;
    }
  }, [key, fallback]);
  const value = useSyncExternalStore(subscribe, read, () => fallback);
  const set = useCallback(
    (next: boolean) => {
      try {
        localStorage.setItem(key, next ? '1' : '0');
      } catch {
        /* not persisted */
      }
      window.dispatchEvent(new Event(EVENT));
    },
    [key],
  );
  return [value, set] as const;
}
