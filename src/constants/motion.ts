/** Shared easing/duration so every animation feels consistent (same as the user app). */
export const EASE_OUT = [0.22, 1, 0.36, 1] as const;
export const TRANSITION = { duration: 0.45, ease: EASE_OUT } as const;
export const SPRING = { type: 'spring', stiffness: 420, damping: 34 } as const;
