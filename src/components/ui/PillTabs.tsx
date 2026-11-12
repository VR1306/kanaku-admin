'use client';

import { useId } from 'react';
import { motion } from 'framer-motion';
import { SPRING } from '@/constants/motion';
import { cn } from '@/utils/cn';

interface Tab<T extends string> {
  value: T;
  label: string;
  count?: number;
}

/** Filter tabs with counts and a sliding active background (e.g. Users: All / Invited / Active …). Scrolls on small screens. */
export function PillTabs<T extends string>({
  tabs,
  value,
  onChange,
  'aria-label': label,
  compact,
  wrap,
}: {
  tabs: readonly Tab<T>[];
  value: T;
  onChange: (v: T) => void;
  'aria-label': string;
  /** Smaller pills for narrow panes. */
  compact?: boolean;
  /** Wrap onto a second line instead of scrolling sideways. */
  wrap?: boolean;
}) {
  const id = useId();
  return (
    <div
      role="tablist"
      aria-label={label}
      className={cn('flex gap-2', wrap ? 'flex-wrap' : '-mx-1 overflow-x-auto px-1 pb-1')}
    >
      {tabs.map((t) => {
        const active = t.value === value;
        return (
          <button
            key={t.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t.value)}
            className={cn(
              'relative inline-flex shrink-0 items-center rounded-full border font-semibold whitespace-nowrap transition-colors',
              compact ? 'h-9 gap-1.5 px-3 text-[13px]' : 'h-10 gap-2 px-4 text-sm',
              active
                ? 'border-transparent text-white'
                : 'border-line-strong bg-surface text-ink-2 hover:bg-canvas',
            )}
          >
            {active && (
              <motion.span
                layoutId={`pill-${id}`}
                transition={SPRING}
                className="absolute inset-0 rounded-full bg-brand"
              />
            )}
            <span className="relative">{t.label}</span>
            {t.count !== undefined && (
              <span
                className={cn(
                  'relative rounded-full px-2 py-0.5 text-xs',
                  active ? 'bg-white/20' : 'bg-canvas text-muted',
                )}
              >
                {t.count.toLocaleString('en-IN')}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
