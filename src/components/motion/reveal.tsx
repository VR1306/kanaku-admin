import type { CSSProperties, ReactNode } from 'react';

/**
 * Fades and slides its content into place on mount. Pure CSS (`.reveal-mount` in globals.css), so content paints
 * without waiting for the animation library to load and hydrate.
 */
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
  const style = { '--rd': `${delay}s`, '--rx': `${x}px`, '--ry': `${y}px` } as CSSProperties;
  return (
    <div className={`reveal-mount${className ? ` ${className}` : ''}`} style={style}>
      {children}
    </div>
  );
}
