'use client';

import { cn } from '@/utils/cn';
import { Button } from './Button';
import { ProgressBar } from './Spinner';
import { EmptyState, Skeleton } from './Skeleton';

export interface Column<T> {
  key: string;
  /** Always provide a header — for the row-actions column use "Actions". */
  header: React.ReactNode;
  render: (row: T) => React.ReactNode;
  align?: 'left' | 'center' | 'right';
  /** Extra classes for both header and cells (widths, hiding on small screens, …). */
  className?: string;
}

export interface Selection {
  selected: string[];
  onChange: (ids: string[]) => void;
}

interface Props<T> {
  columns: Column<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  emptyTitle?: string;
  emptyHint?: string;
  /** Adds a checkbox column with a "select all on this page" header checkbox (indeterminate when partial). */
  selection?: Selection & { label: (row: T) => string };
  caption?: string;
  /** First load: shows skeleton rows under the real header. */
  loading?: boolean;
  /** Refetching with old rows on screen (filter / page change): dims rows and shows a progress bar. */
  refreshing?: boolean;
  /** Failed load: shows an error state with a Retry button. */
  error?: string;
  onRetry?: () => void;
  /** Scroll area height before the header sticks (default 70vh). */
  maxHeight?: string;
}

const ALIGN = { left: 'text-left', center: 'text-center', right: 'text-right' } as const;
const WIDTHS = ['w-40', 'w-28', 'w-20', 'w-24', 'w-32', 'w-16'];

/**
 * The one table used everywhere: grey header band that stays visible while scrolling (sticky inside the scroll area),
 * uppercase labels, soft row dividers, hover + selected tints, horizontal scroll on small screens, and built-in
 * loading / empty / error / refreshing states. Every column has a header, including checkbox and Actions.
 */
export function DataTable<T>({
  columns,
  rows,
  rowKey,
  emptyTitle = 'Nothing here yet',
  emptyHint,
  selection,
  caption,
  loading,
  refreshing,
  error,
  onRetry,
  maxHeight = '70vh',
}: Props<T>) {
  const ids = rows.map(rowKey);
  const all = !!selection && ids.length > 0 && ids.every((id) => selection.selected.includes(id));
  const some = !!selection && !all && ids.some((id) => selection.selected.includes(id));
  const toggleAll = (checked: boolean) =>
    selection?.onChange(
      checked
        ? [...new Set([...selection.selected, ...ids])]
        : selection.selected.filter((s) => !ids.includes(s)),
    );
  const th =
    'sticky top-0 z-10 bg-canvas px-4 py-4 text-xs font-bold tracking-[0.08em] whitespace-nowrap text-muted uppercase first:pl-5 last:pr-5 sm:first:pl-7 sm:last:pr-7';
  const td =
    'px-4 py-3.5 align-middle whitespace-nowrap first:pl-5 last:pr-5 sm:first:pl-7 sm:last:pr-7';
  const showEmpty = !loading && !error && rows.length === 0;

  return (
    <div className="relative">
      <ProgressBar active={!!refreshing} />
      <div
        className="overflow-auto overscroll-x-contain"
        style={{ maxHeight }}
        aria-busy={loading || refreshing}
      >
        <table className="w-full min-w-[640px] border-collapse text-left text-[15px]">
          {caption && <caption className="sr-only">{caption}</caption>}
          <thead>
            <tr>
              {selection && (
                <th scope="col" className={cn(th, 'w-12')}>
                  <input
                    type="checkbox"
                    aria-label="Select all rows on this page"
                    disabled={rows.length === 0}
                    checked={all}
                    ref={(el) => {
                      if (el) el.indeterminate = some;
                    }}
                    onChange={(e) => toggleAll(e.target.checked)}
                  />
                </th>
              )}
              {columns.map((c) => (
                <th
                  key={c.key}
                  scope="col"
                  className={cn(th, ALIGN[c.align ?? 'left'], c.className)}
                >
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className={cn('transition-opacity duration-200', refreshing && 'opacity-50')}>
            {loading &&
              Array.from({ length: 6 }, (_, i) => (
                <tr key={`sk${i}`} className="border-t border-line-soft">
                  {selection && (
                    <td className={cn(td, 'w-12')}>
                      <Skeleton className="size-[18px] rounded" />
                    </td>
                  )}
                  {columns.map((c, j) => (
                    <td key={c.key} className={cn(td, c.className)}>
                      <Skeleton
                        className={cn(
                          'h-4',
                          WIDTHS[(i + j) % WIDTHS.length],
                          c.align === 'right' && 'ml-auto',
                        )}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            {!loading &&
              !error &&
              rows.map((r) => {
                const id = rowKey(r);
                const checked = !!selection?.selected.includes(id);
                return (
                  <tr
                    key={id}
                    className={cn(
                      'border-t border-line-soft transition-colors hover:bg-canvas/70',
                      checked && 'bg-brand-soft/40',
                    )}
                  >
                    {selection && (
                      <td className={cn(td, 'w-12')}>
                        <input
                          type="checkbox"
                          aria-label={`Select ${selection.label(r)}`}
                          checked={checked}
                          onChange={(e) =>
                            selection.onChange(
                              e.target.checked
                                ? [...selection.selected, id]
                                : selection.selected.filter((s) => s !== id),
                            )
                          }
                        />
                      </td>
                    )}
                    {columns.map((c) => (
                      <td key={c.key} className={cn(td, ALIGN[c.align ?? 'left'], c.className)}>
                        {c.render(r)}
                      </td>
                    ))}
                  </tr>
                );
              })}
          </tbody>
        </table>
        {error && !loading && (
          <div className="px-6 py-14 text-center" role="alert">
            <p className="font-display text-lg font-bold">Couldn’t load this table</p>
            <p className="mx-auto mt-1 max-w-sm text-sm text-muted">{error}</p>
            {onRetry && (
              <Button variant="outline" className="mt-4 h-10" onClick={onRetry}>
                Try again
              </Button>
            )}
          </div>
        )}
        {showEmpty && <EmptyState title={emptyTitle} hint={emptyHint} />}
      </div>
    </div>
  );
}

/** Coloured initial tile used in the first column (same shape as the user app's transaction rows). */
export function Avatar({
  name,
  tone = 'blue',
}: {
  name: string;
  tone?: 'blue' | 'cyan' | 'violet' | 'green' | 'amber' | 'rose';
}) {
  const tones = {
    blue: 'bg-brand-soft text-link',
    cyan: 'bg-cyan-soft text-cyan-deep',
    violet: 'bg-violet-soft text-violet',
    green: 'bg-ok-soft text-ok',
    amber: 'bg-warn-soft text-warn',
    rose: 'bg-bad-soft text-bad',
  } as const;
  return (
    <span
      aria-hidden
      className={cn(
        'grid size-10 shrink-0 place-items-center rounded-[13px] font-display text-[15px] font-bold',
        tones[tone],
      )}
    >
      {name
        .split(/\s+/)
        .slice(0, 2)
        .map((p) => p[0]?.toUpperCase())
        .join('')}
    </span>
  );
}

/** Name + secondary line, for the first column. */
export function Identity({
  name,
  sub,
  tone,
}: {
  name: string;
  sub?: string;
  tone?: Parameters<typeof Avatar>[0]['tone'];
}) {
  return (
    <div className="flex max-w-[280px] min-w-0 items-center gap-3">
      <Avatar name={name} tone={tone} />
      <div className="min-w-0">
        <p className="truncate font-semibold text-ink">{name}</p>
        {sub && <p className="truncate text-[13px] text-muted">{sub}</p>}
      </div>
    </div>
  );
}
