'use client';

import { Icon } from '@/components/icons/icon';
import { Badge, type Tone } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Field';
import { PillTabs } from '@/components/ui/PillTabs';
import { Skeleton } from '@/components/ui/Skeleton';
import { ProgressBar } from '@/components/ui/Spinner';
import { cn } from '@/utils/cn';
import type { Priority } from '@/types/support';
import { StatusPill } from './StatusPill';
import { relTime, type TicketList } from './supportTypes';

export const VIEWS = [
  ['mine', 'Mine'],
  ['unassigned', 'Unassigned'],
  ['open', 'All open'],
  ['resolved', 'Resolved'],
] as const;
export type View = (typeof VIEWS)[number][0];
const PRI: Record<Priority, Tone> = { high: 'red', medium: 'amber', low: 'gray' };

interface Props {
  list: {
    data?: TicketList;
    loading: boolean;
    refreshing: boolean;
    error?: string;
    reload: () => void;
  };
  view: View;
  onView: (v: View) => void;
  q: string;
  onQ: (q: string) => void;
  selected: string | null;
  onSelect: (id: string) => void;
}

/** Ticket inbox: view tabs with counts, search, and rows with avatar, preview, status/priority/SLA badges and an unread count. */
export function TicketListPane({ list, view, onView, q, onQ, selected, onSelect }: Props) {
  const { data } = list;
  return (
    <section
      aria-label="Tickets"
      className="relative flex min-h-0 flex-col border-line lg:border-r"
    >
      <ProgressBar active={list.refreshing} />
      <div className="space-y-3 border-b border-line-soft p-4">
        <PillTabs
          aria-label="Ticket view"
          compact
          wrap
          tabs={VIEWS.map(([id, label]) => ({
            value: id,
            label,
            count: id !== 'resolved' ? (data?.counts[id] ?? 0) : undefined,
          }))}
          value={view}
          onChange={onView}
        />
        <div className="relative">
          <Icon
            name="search"
            size={18}
            className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-subtle"
          />
          <Input
            aria-label="Search tickets"
            placeholder="Search subject, #id or user"
            value={q}
            onChange={(e) => onQ(e.target.value)}
            className="h-11 pl-10"
          />
        </div>
      </div>
      <ul className="min-h-0 flex-1 overflow-y-auto">
        {list.loading &&
          Array.from({ length: 5 }, (_, i) => (
            <li key={i} className="space-y-2 border-b border-line-soft p-4">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="h-3 w-full" />
            </li>
          ))}
        {list.error && !data && (
          <li className="p-6 text-center text-sm text-bad" role="alert">
            {list.error}{' '}
            <button className="font-semibold underline" onClick={list.reload}>
              Try again
            </button>
          </li>
        )}
        {data && data.items.length === 0 && (
          <li className="p-10 text-center">
            <span
              aria-hidden
              className="mx-auto mb-3 grid size-12 place-items-center rounded-[14px] bg-canvas text-subtle"
            >
              <Icon name="support" size={22} />
            </span>
            <p className="font-display font-bold">No tickets here</p>
            <p className="mt-1 text-sm text-muted">
              {q ? 'Try a different search.' : 'You’re all caught up.'}
            </p>
          </li>
        )}
        {data?.items.map((r) => {
          const active = selected === r.id;
          return (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => onSelect(r.id)}
                aria-current={active ? 'true' : undefined}
                className={cn(
                  'relative flex w-full gap-3 border-b border-line-soft p-4 text-left transition-colors',
                  active ? 'bg-brand-soft/60' : 'hover:bg-canvas/70',
                )}
              >
                {active && <span aria-hidden className="absolute inset-y-0 left-0 w-1 bg-brand" />}
                <span className="min-w-0 flex-1">
                  <span className="flex items-start justify-between gap-3">
                    <span
                      className={cn(
                        'min-w-0 text-[15px] break-words',
                        r.unread ? 'font-extrabold' : 'font-semibold',
                      )}
                    >
                      {r.subject}
                    </span>
                    <StatusPill status={r.status} />
                  </span>
                  <span className="mt-1 block text-[13px] text-muted">
                    #{r.id.replace('#', '')} · {r.user.name} ·{' '}
                    <span className={cn(r.sla && 'font-bold text-bad')}>
                      {r.sla ? 'Reply overdue' : relTime(r.ageH)}
                    </span>
                  </span>
                  <span className="mt-1.5 flex items-center gap-2">
                    <span
                      className={cn(
                        'min-w-0 flex-1 truncate text-[13px]',
                        r.unread ? 'font-semibold text-ink' : 'text-muted',
                      )}
                    >
                      {r.lastFrom === 'agent' ? 'You: ' : ''}
                      {r.last || 'No messages yet'}
                    </span>
                    {r.unread > 0 && (
                      <span
                        aria-label={`${r.unread} unread`}
                        className="grid h-5 min-w-5 shrink-0 place-items-center rounded-full bg-cyan px-1.5 text-[11px] font-bold text-on-accent"
                      >
                        {r.unread}
                      </span>
                    )}
                  </span>
                  {r.priority === 'high' && (
                    <span className="mt-2 flex gap-1.5">
                      <Badge tone={PRI[r.priority]}>High priority</Badge>
                    </span>
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
