import { cn } from '@/utils/cn';

/** Small CSS spinner (respects reduced motion via the global rule). */
export function Spinner({ className, size = 16 }: { className?: string; size?: number }) {
  return (
    <svg
      role="status"
      aria-label="Loading"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={cn('animate-spin', className)}
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="3" opacity="0.25" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/** Thin indeterminate bar for "data is refreshing" feedback at the top of a card. */
export function ProgressBar({ active }: { active: boolean }) {
  return (
    <div
      aria-hidden
      className={cn(
        'pointer-events-none absolute inset-x-0 top-0 z-20 h-0.5 overflow-hidden transition-opacity duration-200',
        active ? 'opacity-100' : 'opacity-0',
      )}
    >
      <div className="h-full w-1/3 animate-[kprogress_1.1s_ease-in-out_infinite] rounded-full bg-brand" />
    </div>
  );
}
