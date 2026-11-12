'use client';

import { motion } from 'framer-motion';
import { cn } from '@/utils/cn';

/** 0 = empty … 4 = strong. Counts length 8+/12+, a number, a special character and mixed case. */
export function passwordStrength(p: string): number {
  if (!p) return 0;
  let s = 0;
  if (p.length >= 8) s++;
  if (/\d/.test(p) && /[^A-Za-z0-9]/.test(p)) s++;
  if (/[a-z]/.test(p) && /[A-Z]/.test(p)) s++;
  if (p.length >= 12) s++;
  return Math.max(1, s);
}

const LEVELS = [
  { label: '', bar: '', text: '' },
  { label: 'Weak password', bar: 'bg-bad', text: 'text-bad' },
  { label: 'Fair password', bar: 'bg-cyan-deep', text: 'text-cyan-deep' },
  { label: 'Good password', bar: 'bg-brand', text: 'text-link' },
  { label: 'Strong password', bar: 'bg-ok', text: 'text-ok' },
] as const;

/** Same 4-segment strength meter as the user app. */
export function PasswordStrength({ password }: { password: string }) {
  const score = passwordStrength(password);
  const level = LEVELS[score];
  return (
    <div aria-live="polite">
      <div className="flex gap-2" aria-hidden="true">
        {[1, 2, 3, 4].map((i) => (
          <span key={i} className="h-1.5 flex-1 overflow-hidden rounded-full bg-line">
            <motion.span
              className={cn('block h-full origin-left rounded-full', level.bar)}
              initial={false}
              animate={{ scaleX: i <= score ? 1 : 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            />
          </span>
        ))}
      </div>
      <p className={cn('mt-2 h-4 text-[13px] font-semibold', level.text)}>{level.label}</p>
    </div>
  );
}
