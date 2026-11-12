'use client';

import { useEffect, type ReactNode } from 'react';
import { AnimatePresence, animate, motion, useMotionValue, useTransform } from 'framer-motion';
import { EASE_OUT } from '@/constants/motion';

const SWAP = { duration: 0.22, ease: EASE_OUT } as const;

/**
 * Cross-fades between panels when `id` changes (tabs, loading → loaded swaps). The leaving panel is taken out of the
 * flow (popLayout) so the container never collapses between panels — no layout shift or flicker.
 */
export function FadeSwitch({
  id,
  children,
  className,
}: {
  id: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className="relative">
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.div
          key={id}
          className={className}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={SWAP}
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/** Counts a number up to its value, formatted by `format`. */
export function CountUp({
  value,
  format,
  className,
}: {
  value: number;
  format: (n: number) => string;
  className?: string;
}) {
  const mv = useMotionValue(0);
  const text = useTransform(mv, (n) => format(n));
  useEffect(() => {
    const c = animate(mv, value, { duration: 0.7, ease: EASE_OUT });
    return () => c.stop();
  }, [mv, value]);
  return <motion.span className={className}>{text}</motion.span>;
}
