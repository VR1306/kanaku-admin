'use client';

import { useSyncExternalStore } from 'react';
import { SelectField } from '@/components/ui/Field';
import { applyThemeChoice, storedThemeChoice } from '@/hooks/useTheme';
import { SectionShell } from './SectionShell';

/** Theme is a per-device preference (stored locally), the same behaviour as the user app. */
type Choice = 'light' | 'dark' | 'system';
const listeners = new Set<() => void>();
const subscribe = (fn: () => void) => {
  listeners.add(fn);
  return () => void listeners.delete(fn);
};

export function AppearanceTab() {
  // Server and first client render both use 'system'; the stored choice is read after hydration (no mismatch).
  const choice = useSyncExternalStore<Choice>(subscribe, storedThemeChoice, () => 'system');
  const setChoice = (c: Choice) => {
    applyThemeChoice(c);
    listeners.forEach((fn) => fn());
  };
  return (
    <SectionShell title="Appearance">
      <div className="max-w-sm">
        <SelectField
          label="Theme"
          value={choice}
          onChange={(e) => {
            setChoice(e.target.value as Choice);
          }}
          options={[
            { value: 'system', label: 'Match my device' },
            { value: 'light', label: 'Light' },
            { value: 'dark', label: 'Dark' },
          ]}
          hint="Applies instantly on this device."
        />
      </div>
    </SectionShell>
  );
}
