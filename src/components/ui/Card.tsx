import type { HTMLAttributes } from 'react';
import { cn } from '@/utils/cn';

/** Surface card. Default padding is dropped when the caller passes its own `p-*` class (e.g. `p-0` for table cards). */
export function Card({ className, ...rest }: HTMLAttributes<HTMLDivElement>) {
  const ownPadding = /(^|\s)p-/.test(className ?? '');
  return (
    <div
      {...rest}
      className={cn(
        'rounded-[24px] border border-line bg-surface',
        !ownPadding && 'p-6',
        className,
      )}
    />
  );
}
