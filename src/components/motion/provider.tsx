'use client';

import type { ReactNode } from 'react';
import { LazyMotion, MotionConfig } from 'framer-motion';

// Loaded after hydration instead of in the first bundle: smaller initial JS, shorter main-thread block.
const loadFeatures = () => import('./features').then((mod) => mod.default);

/** Provides animation features lazily and disables transform animations for users who prefer reduced motion. */
export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={loadFeatures}>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  );
}
