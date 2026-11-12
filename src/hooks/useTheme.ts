'use client';

import { useSyncExternalStore } from 'react';
import { THEME_STORAGE_KEY, type Theme } from '@/constants/theme';

function subscribe(notify: () => void) {
  const o = new MutationObserver(notify);
  o.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  return () => o.disconnect();
}
const snapshot = (): Theme =>
  document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';

export function useTheme() {
  const theme = useSyncExternalStore(subscribe, snapshot, () => 'light' as Theme);
  const setTheme = (next: Theme) => {
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      /* not persisted */
    }
  };
  return { theme, setTheme, toggle: () => setTheme(theme === 'dark' ? 'light' : 'dark') };
}

/** What the user picked: "system" when nothing is stored on this device. */
export function storedThemeChoice(): 'light' | 'dark' | 'system' {
  try {
    const v = localStorage.getItem(THEME_STORAGE_KEY);
    return v === 'light' || v === 'dark' ? v : 'system';
  } catch {
    return 'system';
  }
}
export function applyThemeChoice(choice: 'light' | 'dark' | 'system') {
  try {
    if (choice === 'system') localStorage.removeItem(THEME_STORAGE_KEY);
    else localStorage.setItem(THEME_STORAGE_KEY, choice);
  } catch {
    /* not persisted */
  }
  const dark =
    choice === 'dark' ||
    (choice === 'system' && matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.dataset.theme = dark ? 'dark' : 'light';
}
