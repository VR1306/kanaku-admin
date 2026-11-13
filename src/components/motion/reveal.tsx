'use client';

import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { TRANSITION } from '@/constants/motion';

/** Fades and slides its content into place on mount. */
export function Reveal({
  children,
  delay = 0,
  x = 0,
  y = 16,
  className,
}: {
  children: ReactNode;
  delay?: number;
  x?: number;
  y?: number;
  className?: string;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, x, y }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{ ...TRANSITION, delay }}
    >
      {children}
    </motion.div>
  );
}
