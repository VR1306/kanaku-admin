'use client';

import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { TRANSITION } from '@/constants/motion';

/** Re-mounts on every navigation, giving each page a soft fade/slide-in (same as the user app). */
export default function DashboardTemplate({ children }: { children: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={TRANSITION}
    >
      {children}
    </motion.div>
  );
}
