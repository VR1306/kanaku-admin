'use client';

import { cn } from '@/utils/cn';
import { ApiError } from '@/lib/api-client';
import { PLAN_LABEL, type PlanId } from '@/types/users';

export const PLAN_OPTIONS = (Object.keys(PLAN_LABEL) as PlanId[]).map((p) => ({
  value: p,
  label: PLAN_LABEL[p],
}));
export const msg = (e: unknown) => (e instanceof ApiError ? e.message : 'Action failed');

export function Choice({
  checked,
  onChange,
  title,
  hint,
  name,
}: {
  checked: boolean;
  onChange: () => void;
  title: string;
  hint: string;
  name: string;
}) {
  return (
    <label
      className={cn(
        'flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition-colors',
        checked ? 'border-brand bg-brand-soft/50' : 'border-line hover:bg-canvas',
      )}
    >
      <input type="radio" name={name} checked={checked} onChange={onChange} className="mt-0.5" />
      <span>
        <span className="block font-semibold">{title}</span>
        <span className="block text-[13px] text-muted">{hint}</span>
      </span>
    </label>
  );
}
