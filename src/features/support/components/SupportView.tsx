'use client';

import { useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/icons/icon';
import { Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { useApi } from '@/hooks/useApi';
import { useRealtime } from '@/hooks/useRealtime';
import { api, ApiError } from '@/lib/api-client';
import { cn } from '@/utils/cn';
import type { Priority, TicketStatus } from '@/types/support';
import { ConversationPane } from './ConversationPane';
import { TicketInfo } from './TicketInfo';
import { TicketManage } from './TicketManage';
import { TicketListPane, type View } from './TicketListPane';
import type { Detail, TicketList } from './supportTypes';

const POLL_MS = 3000; // fallback only while the realtime socket is down
const SYNC_MS = 30_000; // slow safety-net sync even when connected

/**
 * Inbox | conversation | details. Below `lg` it is a list → conversation flow (back button); below `2xl` the details
 * panel opens as a drawer. Live updates arrive over the Socket.IO realtime service, with a polling fallback while disconnected.
 */
export function SupportView() {
  const { toast } = useToast();
  const [view, setView] = useState<View>('open');
  const [q, setQ] = useState('');
  const [sel, setSel] = useState<string | null>(null);
  const [details, setDetails] = useState(false);
  const [typingFor, setTypingFor] = useState<string | null>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const list = useApi<TicketList>(`/api/support/tickets?view=${view}&q=${encodeURIComponent(q)}`);
  const detail = useApi<Detail>(sel ? `/api/support/tickets/${encodeURIComponent(sel)}` : null);
  const { reload: reloadList } = list;
  const { reload: reloadDetail } = detail;

  const { connected, available, emit } = useRealtime(
    {
      // New / changed conversations arrive instantly; refetch the list and the open conversation.
      'chat:updated': (p: { ticketId: string }) => {
        reloadList();
        if (p.ticketId === sel) reloadDetail();
        if (p.ticketId === sel) setTypingFor(null);
      },
      // The customer started typing: show the indicator for a few seconds.
      'chat:typing': (p: { ticketId: string; who: string }) => {
        if (p.who !== 'user') return;
        setTypingFor(p.ticketId);
        clearTimeout(typingTimer.current);
        typingTimer.current = setTimeout(() => setTypingFor(null), 4000);
      },
    },
    () => {
      // After any (re)connect, resynchronise anything missed while offline.
      reloadList();
      if (sel) reloadDetail();
    },
  );

  useEffect(() => {
    const t = setInterval(
      () => {
        reloadList();
        if (sel) reloadDetail();
      },
      connected ? SYNC_MS : POLL_MS,
    );
    return () => clearInterval(t);
  }, [sel, connected, reloadList, reloadDetail]);

  const patch = async (
    body: { status?: TicketStatus; priority?: Priority; assignee?: string | null },
    ok: string,
  ) => {
    try {
      await api(`/api/support/tickets/${encodeURIComponent(sel!)}`, { method: 'PATCH', body });
      toast(ok);
      reloadList();
      reloadDetail();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Update failed');
    }
  };
  const t = sel ? detail.data : undefined;
  const online = list.data?.agents.filter((a) => a.online).length ?? 0;
  const unread = list.data?.items.reduce((n, r) => n + r.unread, 0) ?? 0;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-extrabold sm:text-4xl">Support</h1>
        <p className="mt-1 text-sm text-muted">
          {list.data?.counts.open ?? '–'} open · {unread} unread · {online} agent
          {online === 1 ? '' : 's'} online · first-reply target 4 h
        </p>
      </header>

      <div className="grid h-[calc(100dvh-12.5rem)] min-h-[32rem] overflow-hidden rounded-[24px] border border-line bg-surface lg:grid-cols-[minmax(300px,360px)_minmax(0,1fr)] 2xl:grid-cols-[minmax(300px,360px)_minmax(0,1fr)_320px]">
        <div className={cn('min-h-0 flex-col', sel ? 'hidden lg:flex' : 'flex')}>
          <TicketListPane
            list={list}
            view={view}
            onView={setView}
            q={q}
            onQ={setQ}
            selected={sel}
            onSelect={(id) => setSel(id)}
          />
        </div>
        <div className={cn('min-h-0 min-w-0 flex-col', sel ? 'flex' : 'hidden lg:flex')}>
          {!sel && (
            <div className="m-auto max-w-xs px-6 text-center">
              <span
                aria-hidden
                className="mx-auto mb-3 grid size-14 place-items-center rounded-[18px] bg-canvas text-subtle"
              >
                <Icon name="support" size={26} />
              </span>
              <p className="font-display text-lg font-bold">Select a ticket</p>
              <p className="mt-1 text-sm text-muted">
                Pick a conversation from the inbox to read and reply.
              </p>
            </div>
          )}
          {sel && !t && !detail.error && (
            <div className="space-y-4 p-6">
              <Skeleton className="h-12" />
              <Skeleton className="h-24 w-2/3" />
              <Skeleton className="ml-auto h-16 w-1/2" />
              <Skeleton className="h-20 w-3/5" />
            </div>
          )}
          {sel && detail.error && !t && (
            <p role="alert" className="m-6 rounded-xl bg-bad-soft p-4 text-sm text-bad">
              {detail.error}{' '}
              <button className="font-semibold underline" onClick={() => setSel(null)}>
                Back
              </button>
            </p>
          )}
          {sel && t && (
            <ConversationPane
              t={t}
              agents={list.data?.agents ?? []}
              quickReplies={list.data?.quickReplies ?? []}
              onPatch={patch}
              onSent={() => {
                reloadDetail();
                reloadList();
              }}
              onTyping={() => emit('typing', { ticketId: t.id })}
              liveTyping={typingFor === t.id}
              onBack={() => setSel(null)}
              onDetails={() => setDetails(true)}
            />
          )}
        </div>
        <aside
          aria-label="Customer and ticket details"
          className="hidden min-h-0 overflow-y-auto border-l border-line p-5 2xl:block"
        >
          {t ? (
            <TicketInfo t={t} />
          ) : (
            <p className="mt-10 text-center text-sm text-muted">
              Customer and ticket details appear here.
            </p>
          )}
        </aside>
      </div>
      <Modal
        open={details && !!t}
        variant="drawer"
        title="Details"
        subtitle={t?.subject}
        onClose={() => setDetails(false)}
      >
        {t && (
          <>
            <TicketManage t={t} agents={list.data?.agents ?? []} onPatch={patch} />
            <TicketInfo t={t} />
          </>
        )}
      </Modal>
      <p className="flex flex-wrap items-center gap-2 text-xs text-muted">
        <span
          aria-hidden
          className={`inline-block size-2 rounded-full ${connected ? 'bg-ok' : 'bg-warn'}`}
        />
        {connected
          ? 'Live — new messages arrive instantly.'
          : available
            ? 'Reconnecting to live updates…'
            : 'Refreshing every few seconds.'}{' '}
        Tickets close automatically 7 days after resolution.
      </p>
    </div>
  );
}
