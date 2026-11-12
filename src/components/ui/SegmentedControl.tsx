'use client';

import { useId, type KeyboardEvent, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { SPRING } from '@/constants/motion';
import { cn } from '@/utils/cn';

interface Option<T extends string> {
  value: T;
  label: ReactNode;
}

/** Tabs/radio group whose highlight slides to the chosen option (ported from the user app). Arrow keys move the selection. */
export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  variant = 'card',
  compact,
  className,
  ...rest
}: {
  options: readonly Option<T>[];
  value: T;
  onChange: (v: T) => void;
  'aria-label': string;
  variant?: 'card' | 'page';
  /** Equal-width segments with tighter padding (narrow panes). */
  compact?: boolean;
  className?: string;
}) {
  const id = useId();
  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const step =
      e.key === 'ArrowRight' || e.key === 'ArrowDown'
        ? 1
        : e.key === 'ArrowLeft' || e.key === 'ArrowUp'
          ? -1
          : 0;
    if (!step) return;
    e.preventDefault();
    const i = options.findIndex((o) => o.value === value);
    const next = options[(i + step + options.length) % options.length];
    onChange(next.value);
    e.currentTarget
      .querySelectorAll<HTMLButtonElement>('[role=radio]')
      [options.indexOf(next)]?.focus();
  }
  return (
    <div
      role="radiogroup"
      aria-label={rest['aria-label']}
      onKeyDown={onKeyDown}
      className={cn(
        'inline-flex max-w-full overflow-x-auto',
        variant === 'card'
          ? 'rounded-[14px] border border-line bg-surface p-[5px]'
          : 'rounded-[14px] bg-canvas p-1',
        className,
      )}
    >
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={selected}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(o.value)}
            className={cn(
              compact
                ? 'relative h-10 min-w-0 flex-1 rounded-[10px] px-2 text-[13px] whitespace-nowrap transition-colors duration-200'
                : 'relative h-10 shrink-0 rounded-[10px] px-4 text-sm whitespace-nowrap transition-colors duration-200',
              selected ? 'font-bold text-white' : 'font-medium text-ink-2 hover:text-ink',
            )}
          >
            {selected && (
              <motion.span
                layoutId={`segment-${id}`}
                aria-hidden="true"
                className="absolute inset-0 rounded-[10px] bg-brand"
                transition={SPRING}
              />
            )}
            <span className="relative">{o.label}</span>
          </button>
        );
      })}
    </div>
  );
}
