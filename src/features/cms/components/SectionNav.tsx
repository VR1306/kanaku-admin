'use client';

import { useId } from 'react';
import { motion } from 'framer-motion';
import { Icon, type IconName } from '@/components/icons/icon';
import { SPRING } from '@/constants/motion';
import { cn } from '@/utils/cn';

export const SECTIONS = [
  { id: 'Hero', icon: 'announcements', hint: 'Navigation, headline, card & buttons' },
  { id: 'Features', icon: 'categories', hint: 'Feature cards' },
  { id: 'Pricing', icon: 'payments', hint: 'Plans shown on the site' },
  { id: 'FAQ', icon: 'help', hint: 'Questions & answers' },
  { id: 'Theme', icon: 'sun', hint: 'Colours, shape, buttons' },
  { id: 'Footer', icon: 'website', hint: 'Tagline & contact' },
  { id: 'Structure', icon: 'team', hint: 'Steps, CTA, footer links & SEO' },
  { id: 'Legal', icon: 'lock', hint: 'Privacy Policy & Terms' },
  { id: 'Versions', icon: 'calendar', hint: 'Publish history' },
] as const satisfies ReadonlyArray<{ id: string; icon: IconName; hint: string }>;
export type SectionId = (typeof SECTIONS)[number]['id'];

export function SectionNav({
  value,
  onChange,
}: {
  value: SectionId;
  onChange: (s: SectionId) => void;
}) {
  const pill = useId();
  return (
    <nav
      aria-label="Website sections"
      className="flex gap-2 overflow-x-auto rounded-[20px] border border-line bg-surface p-2 xl:flex-col xl:overflow-visible"
    >
      {SECTIONS.map((s) => {
        const active = value === s.id;
        return (
          <button
            key={s.id}
            type="button"
            aria-current={active ? 'true' : undefined}
            onClick={() => onChange(s.id)}
            className={cn(
              'relative flex shrink-0 items-center gap-3 rounded-[14px] px-3.5 py-3 text-left transition-colors xl:w-full',
              active ? 'text-link' : 'text-ink-2 hover:bg-canvas',
            )}
          >
            {active && (
              <motion.span
                layoutId={`cms-nav-${pill}`}
                transition={SPRING}
                className="absolute inset-0 rounded-[14px] bg-brand-soft"
              />
            )}
            <span
              className={cn(
                'relative grid size-9 shrink-0 place-items-center rounded-[11px]',
                active ? 'bg-brand text-white' : 'bg-canvas text-muted',
              )}
            >
              <Icon name={s.icon} size={18} />
            </span>
            <span className="relative min-w-0">
              <span className="block text-sm font-bold">{s.id}</span>
              <span className="hidden text-xs text-muted xl:block">{s.hint}</span>
            </span>
          </button>
        );
      })}
    </nav>
  );
}
