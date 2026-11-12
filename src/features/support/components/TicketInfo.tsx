import Link from 'next/link';
import { Icon } from '@/components/icons/icon';
import { Badge } from '@/components/ui/Badge';
import { formatIST } from '@/utils/format';
import { STATUS_LABEL } from '@/types/support';
import type { Detail } from './supportTypes';

const Row = ({ k, v }: { k: string; v: React.ReactNode }) => (
  <div className="flex items-start justify-between gap-3 border-b border-line-soft py-2.5 text-sm last:border-0">
    <dt className="text-muted">{k}</dt>
    <dd className="text-right font-semibold">{v}</dd>
  </div>
);

/** Related user + ticket details (shown beside the chat on wide screens, in a drawer otherwise). */
export function TicketInfo({ t }: { t: Detail }) {
  return (
    <div className="space-y-6">
      <section>
        <h3 className="mb-3 text-xs font-bold tracking-[0.1em] text-muted uppercase">Customer</h3>
        <div className="flex items-center gap-3 rounded-2xl border border-line p-3.5">
          <span
            aria-hidden
            className="grid size-12 shrink-0 place-items-center rounded-[14px] bg-brand-soft font-display font-bold text-link"
          >
            {t.user.name
              .split(/\s+/)
              .slice(0, 2)
              .map((p) => p[0])
              .join('')}
          </span>
          <div className="min-w-0">
            <p className="truncate font-semibold">{t.user.name}</p>
            <p className="text-[13px] text-muted">{t.user.plan}</p>
          </div>
        </div>
        <div className="mt-3 grid gap-2">
          <Link
            href={`/users/${t.user.id}`}
            className="flex h-11 items-center justify-between rounded-control border border-line-strong px-4 text-sm font-semibold text-link hover:bg-canvas"
          >
            View user profile
            <Icon name="external" size={15} />
          </Link>
          <Link
            href="/billing"
            className="flex h-11 items-center justify-between rounded-control border border-line-strong px-4 text-sm font-semibold text-link hover:bg-canvas"
          >
            Related payments
            <Icon name="external" size={15} />
          </Link>
        </div>
      </section>
      <section>
        <h3 className="mb-1 text-xs font-bold tracking-[0.1em] text-muted uppercase">Ticket</h3>
        <dl>
          <Row k="Ticket" v={t.id} />
          <Row k="Topic" v={t.topic} />
          <Row k="Status" v={<Badge tone="blue">{STATUS_LABEL[t.status]}</Badge>} />
          <Row k="Assignee" v={t.assigneeName ?? 'Unassigned'} />
          <Row k="Created" v={formatIST(t.createdAt)} />
          <Row
            k="First reply"
            v={
              t.firstResponseAt ? (
                formatIST(t.firstResponseAt)
              ) : (
                <span className={t.sla ? 'text-bad' : 'text-muted'}>
                  {t.sla ? 'Overdue (> 4 h)' : 'Not yet'}
                </span>
              )
            }
          />
          {t.resolvedAt && <Row k="Resolved" v={formatIST(t.resolvedAt)} />}
          {t.rating && (
            <Row
              k="Rating"
              v={
                <span className="text-warn">
                  {'★'.repeat(t.rating)}
                  {'☆'.repeat(5 - t.rating)}
                </span>
              }
            />
          )}
        </dl>
      </section>
      <p className="rounded-2xl bg-canvas p-3.5 text-xs text-muted">
        Internal notes are only visible to the team. Resolved tickets close automatically after 7
        days; users can reopen within that window.
      </p>
    </div>
  );
}
