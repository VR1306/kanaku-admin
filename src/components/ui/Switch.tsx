'use client';

import { m as motion } from 'framer-motion';
import { SPRING } from '@/constants/motion';
import { cn } from '@/utils/cn';

/** On/off toggle (ported from the user app): the knob slides with a spring and the track changes colour. */
export function Switch({
  checked,
  onChange,
  disabled,
  size = 'md',
  ...rest
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  'aria-label': string;
  disabled?: boolean;
  size?: 'sm' | 'md';
}) {
  const sm = size === 'sm';
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={rest['aria-label']}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative shrink-0 rounded-full transition-colors duration-200 disabled:cursor-not-allowed disabled:opacity-60',
        sm ? 'h-6 w-11' : 'h-8 w-14',
        checked ? 'bg-brand' : 'bg-line-strong',
      )}
    >
      <motion.span
        aria-hidden="true"
        initial={false}
        animate={{ x: checked ? (sm ? 20 : 24) : 0 }}
        transition={SPRING}
        className={cn(
          'absolute rounded-full shadow-sm transition-colors duration-200',
          sm ? 'top-[3px] left-[3px] size-[18px]' : 'top-[3px] left-[3px] size-[26px]',
          checked ? 'bg-cyan' : 'bg-white',
        )}
      />
    </button>
  );
}
