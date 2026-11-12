'use client';

import { Icon } from '@/components/icons/icon';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Field';
import { STATUS_LABEL, type Priority, type TicketStatus } from '@/types/support';
import { StatusPill } from './StatusPill';
import { ChatPanel } from './ChatPanel';
import type { Detail, TicketList } from './supportTypes';

interface Props {
  t: Detail;
  agents: TicketList['agents'];
  quickReplies: string[];
  onPatch: (
    b: { status?: TicketStatus; priority?: Priority; assignee?: string | null },
    ok: string,
  ) => void;
  onSent: () => void;
  onTyping?: () => void;
  /** The customer is typing right now (realtime). */
  liveTyping?: boolean;
  onBack: () => void;
  onDetails: () => void;
}

/** Sticky conversation header (subject, status, assign / priority / status / resolve) over the chat. */
export function ConversationPane({
  t,
  agents,
  quickReplies,
  onPatch,
  onSent,
  onTyping,
  liveTyping,
  onBack,
  onDetails,
}: Props) {
  const done = t.status === 'resolved' || t.status === 'closed';
  return (
    <section aria-label="Conversation" className="flex min-h-0 min-w-0 flex-1 flex-col">
      <header className="sticky top-0 z-10 space-y-3 border-b border-line bg-surface p-4 sm:px-6">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={onBack}
            aria-label="Back to tickets"
            className="grid size-11 shrink-0 place-items-center rounded-[12px] bg-canvas text-link lg:hidden"
          >
            <Icon name="chevronLeft" size={20} strokeWidth={2.4} />
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] text-muted">
              #{t.id.replace('#', '')} · opened{' '}
              {new Date(t.createdAt).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}{' '}
              · {t.topic}
            </p>
            <h2 className="mt-0.5 font-display text-lg leading-tight font-bold break-words sm:text-xl">
              {t.subject}
            </h2>
            <p className="truncate text-[13px] text-muted">
              {t.user.name} · {t.user.plan} plan
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <StatusPill status={t.status} />
            {t.sla && (
              <span className="hidden sm:inline-flex">
                <Badge tone="red">Reply overdue</Badge>
              </span>
            )}
            <button
              type="button"
              onClick={onDetails}
              aria-label="Customer and ticket details"
              className="grid size-11 place-items-center rounded-[12px] border border-line-strong text-ink-2 hover:bg-canvas 2xl:hidden"
            >
              <Icon name="profile" size={18} />
            </button>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <Select
            aria-label="Assignee"
            compact
            className="hidden w-48 sm:block"
            value={t.assignee ?? ''}
            onChange={(e) => onPatch({ assignee: e.target.value || null }, 'Assignment updated')}
            options={[
              { value: '', label: 'Unassigned (queued)' },
              ...agents.map((a) => ({
                value: a.id,
                label: `${a.name}${a.online ? '' : ' (offline)'} · ${a.open}`,
              })),
            ]}
          />
          <Select
            aria-label="Priority"
            compact
            className="hidden w-[7.5rem] sm:block"
            value={t.priority}
            onChange={(e) => onPatch({ priority: e.target.value as Priority }, 'Priority updated')}
            options={['high', 'medium', 'low'].map((p) => ({
              value: p,
              label: p[0].toUpperCase() + p.slice(1),
            }))}
          />
          <Select
            aria-label="Status"
            compact
            className="min-w-0 flex-1 sm:w-40 sm:flex-none"
            value={t.status}
            onChange={(e) => onPatch({ status: e.target.value as TicketStatus }, 'Status updated')}
            options={(Object.keys(STATUS_LABEL) as TicketStatus[]).map((s) => ({
              value: s,
              label: STATUS_LABEL[s],
            }))}
          />
          {!done && (
            <Button
              className="h-12 sm:ml-auto"
              onClick={() => onPatch({ status: 'resolved' }, 'Ticket resolved')}
            >
              <Icon name="check" size={18} strokeWidth={2.6} />
              Resolve
            </Button>
          )}
          {t.status === 'resolved' && (
            <Button
              variant="outline"
              className="h-12 sm:ml-auto"
              onClick={() => onPatch({ status: 'closed' }, 'Ticket closed')}
            >
              Close ticket
            </Button>
          )}
        </div>
      </header>
      <ChatPanel
        mode="admin"
        ticketId={t.id}
        messages={t.messages}
        userTyping={t.userTyping || !!liveTyping}
        onTyping={onTyping}
        quickReplies={quickReplies}
        closed={t.status === 'closed'}
        onSent={onSent}
      />
    </section>
  );
}
