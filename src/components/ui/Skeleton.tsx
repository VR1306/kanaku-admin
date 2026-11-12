import { cn } from '@/utils/cn';

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn('animate-pulse rounded-control bg-line', className)} />;
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="px-6 py-16 text-center">
      <span
        aria-hidden
        className="mx-auto mb-3 grid size-12 place-items-center rounded-[14px] bg-canvas text-2xl text-subtle"
      >
        ∅
      </span>
      <p className="font-display text-lg font-bold">{title}</p>
      {hint && <p className="mx-auto mt-1 max-w-sm text-sm text-muted">{hint}</p>}
    </div>
  );
}
