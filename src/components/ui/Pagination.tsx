'use client';

import { cn } from '@/utils/cn';

/** Page numbers to show: the first, the last and a window around the current page. */
function pageWindow(page: number, count: number): (number | '…')[] {
  const pages = new Set([1, count, page - 1, page, page + 1].filter((p) => p >= 1 && p <= count));
  const sorted = [...pages].sort((a, b) => a - b);
  return sorted.flatMap((p, i) => (i > 0 && p - sorted[i - 1] > 1 ? ['…' as const, p] : [p]));
}

export function Pagination({
  page,
  pageSize,
  total,
  onPage,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPage: (p: number) => void;
}) {
  const count = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(total, page * pageSize);
  const btn =
    'grid size-11 place-items-center rounded-[12px] border text-sm font-semibold transition-colors disabled:opacity-40';
  return (
    <nav
      aria-label="Pagination"
      className="flex flex-wrap items-center justify-between gap-3 border-t border-line-soft px-7 py-4 text-sm text-muted"
    >
      <span>
        Showing {from}–{to} of {total.toLocaleString('en-IN')}
      </span>
      <div className="flex items-center gap-1.5">
        <button
          className={cn(btn, 'border-line-strong bg-surface text-link hover:bg-canvas')}
          disabled={page <= 1}
          onClick={() => onPage(page - 1)}
          aria-label="Previous page"
        >
          ‹
        </button>
        {pageWindow(page, count).map((p, i) =>
          p === '…' ? (
            <span key={`e${i}`} className="px-1">
              …
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onPage(p)}
              aria-current={p === page ? 'page' : undefined}
              className={cn(
                btn,
                p === page
                  ? 'border-brand bg-brand text-white'
                  : 'border-line-strong bg-surface text-link hover:bg-canvas',
              )}
            >
              {p}
            </button>
          ),
        )}
        <button
          className={cn(btn, 'border-line-strong bg-surface text-link hover:bg-canvas')}
          disabled={page >= count}
          onClick={() => onPage(page + 1)}
          aria-label="Next page"
        >
          ›
        </button>
      </div>
    </nav>
  );
}
