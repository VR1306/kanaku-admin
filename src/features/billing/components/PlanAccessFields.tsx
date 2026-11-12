'use client';

import { Checkbox, TextField } from '@/components/ui/Field';
import { USER_MODULES } from '@/constants/user-modules';

/**
 * Which User App modules a plan includes, and how many budgets it allows. A module left unticked is hidden from the
 * customer's menu, its pages redirect to "Upgrade", and its API calls are refused. Settings and Help are always on.
 */
export function PlanAccessFields({
  modules,
  maxBudgets,
  onModules,
  onMaxBudgets,
}: {
  modules: string[];
  maxBudgets: string;
  onModules: (m: string[]) => void;
  onMaxBudgets: (v: string) => void;
}) {
  const toggle = (key: string, on: boolean) =>
    onModules(on ? [...modules, key] : modules.filter((k) => k !== key));
  return (
    <fieldset className="space-y-4 rounded-2xl border border-line p-5">
      <legend className="px-2 text-sm font-bold">Customer access</legend>
      <p className="text-[13px] text-muted">
        Tick what customers on this plan can use. Settings and Help &amp; support are always
        available.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        {USER_MODULES.map((m) => (
          <Checkbox
            key={m.key}
            label={m.label}
            checked={modules.includes(m.key)}
            onChange={(e) => toggle(m.key, e.target.checked)}
          />
        ))}
      </div>
      <TextField
        label="Maximum budgets"
        type="number"
        min="1"
        placeholder="Unlimited"
        value={maxBudgets}
        disabled={!modules.includes('budgets')}
        onChange={(e) => onMaxBudgets(e.target.value)}
        hint="Leave empty for unlimited. Starter is 5."
      />
    </fieldset>
  );
}
