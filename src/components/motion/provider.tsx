'use client';

import type { ReactNode } from 'react';
import { MotionConfig } from 'framer-motion';

/** Disables transform animations for users who prefer reduced motion. */
export function MotionProvider({ children }: { children: ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
