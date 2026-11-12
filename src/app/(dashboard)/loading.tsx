import { Skeleton } from '@/components/ui/Skeleton';

/** Route-level skeleton shown while a page's server shell streams in (header + toolbar + content block). */
export default function Loading() {
  return (
    <div className="space-y-6" role="status" aria-label="Loading page">
      <div className="space-y-2">
        <Skeleton className="h-10 w-64 max-w-full" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <Skeleton className="h-12 w-72 max-w-full" />
      <div className="rounded-[24px] border border-line bg-surface p-6">
        <div className="space-y-4">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-10" />
          ))}
        </div>
      </div>
    </div>
  );
}
