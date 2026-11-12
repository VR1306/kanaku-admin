'use client';

import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Icon } from '@/components/icons/icon';
import { Button } from '@/components/ui/Button';
import { Select, TextArea } from '@/components/ui/Field';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { useToast } from '@/components/ui/Toast';
import { api, ApiError } from '@/lib/api-client';
import { cn } from '@/utils/cn';
import type { Attachment, Message } from '@/types/support';
import { ALLOWED_TYPES, MAX_ATTACHMENT } from '../schemas/support';

interface Props {
  ticketId: string;
  messages: Message[];
  userTyping: boolean;
  /** Send a live "agent is typing" signal (realtime socket). */
  onTyping?: () => void;
  /** Same component serves both sides; 'user' mode never renders internal notes or agent-only controls. */
  mode: 'admin' | 'user';
  quickReplies?: string[];
  closed?: boolean;
  onSent: () => void;
}

const time = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit' });
const day = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
const kb = (n: number) =>
  n >= 1024 * 1024
    ? `${(n / 1024 / 1024).toFixed(1)} MB`
    : `${Math.max(1, Math.round(n / 1024))} KB`;

function Typing() {
  return (
    <div className="flex items-center gap-2 text-xs text-muted" aria-live="polite">
      <span className="flex gap-1 rounded-full bg-surface px-3 py-2 ring-1 ring-line">
        {[0, 1, 2].map((i) => (
          <motion.i
            key={i}
            className="size-1.5 rounded-full bg-muted"
            animate={{ opacity: [0.3, 1, 0.3], y: [0, -2, 0] }}
            transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }}
          />
        ))}
      </span>
      The customer is typing…
    </div>
  );
}

/**
 * One message, styled like the User App's conversation: your messages on the right in a soft brand tint,
 * the customer's on the left on a neutral card; a small "who · when" line inside the bubble and ✓ / ✓✓ receipts.
 */
function Bubble({ m, mine }: { m: Message; mine: boolean }) {
  const receipt = m.readAt ? '✓✓ Read' : m.deliveredAt ? '✓✓ Delivered' : '✓ Sent';
  return (
    <div className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[88%] rounded-2xl px-4 py-3 text-[15px] leading-relaxed sm:max-w-[72%]',
          m.internal
            ? 'border border-dashed border-warn bg-warn-soft text-warn'
            : mine
              ? 'bg-brand-soft text-ink'
              : 'border border-line bg-surface text-ink',
        )}
      >
        <p className="mb-1 flex flex-wrap items-center gap-x-1.5 text-xs font-bold text-muted">
          {m.internal && <span className="text-warn">Internal note ·</span>}
          {mine ? 'You' : m.author} · {time(m.at)}
        </p>
        <p className="break-words whitespace-pre-wrap">{m.body}</p>
        {m.attachments?.map((a) => (
          <span
            key={a.name}
            className="mt-2 flex items-center gap-2 rounded-xl bg-canvas px-3 py-2 text-xs text-ink"
          >
            <Icon name="download" size={14} />
            <span className="min-w-0 flex-1 truncate font-semibold">{a.name}</span>
            <span className="opacity-70">{kb(a.size)}</span>
          </span>
        ))}
        {mine && !m.internal && m.from === 'agent' && (
          <p
            className={cn(
              'mt-1 text-right text-[11px]',
              m.readAt ? 'font-semibold text-ok' : 'text-muted',
            )}
            aria-label={m.readAt ? 'Read' : m.deliveredAt ? 'Delivered' : 'Sent'}
          >
            {receipt}
          </p>
        )}
      </div>
    </div>
  );
}

/** Messages (scrolling, day separators, grouped avatars, receipts) + a sticky composer (reply / internal note, attachments, quick replies). */
export function ChatPanel({
  ticketId,
  messages,
  userTyping,
  onTyping,
  mode,
  quickReplies = [],
  closed,
  onSent,
}: Props) {
  const { toast } = useToast();
  const [text, setText] = useState('');
  const [internal, setInternal] = useState(false);
  const [files, setFiles] = useState<Attachment[]>([]);
  const [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  const lastTyping = useRef(0);
  const visible = mode === 'user' ? messages.filter((m) => !m.internal) : messages;

  useEffect(() => {
    end.current?.scrollIntoView({ block: 'end', behavior: 'smooth' });
  }, [visible.length, userTyping]);

  const pick = (list: FileList | null) => {
    const next: Attachment[] = [];
    for (const f of Array.from(list ?? [])) {
      if (!ALLOWED_TYPES.includes(f.type)) {
        toast('Only JPG, PNG or PDF files');
        continue;
      }
      if (f.size > MAX_ATTACHMENT) {
        toast(`${f.name} is over 5 MB`);
        continue;
      }
      next.push({ name: f.name, size: f.size, type: f.type });
    }
    setFiles((cur) => [...cur, ...next].slice(0, 3));
  };
  async function send() {
    if (!text.trim() || busy || closed) return;
    setBusy(true);
    try {
      await api(`/api/support/tickets/${encodeURIComponent(ticketId)}/messages`, {
        body: { body: text, internal, attachments: files.length ? files : undefined },
      });
      setText('');
      setFiles([]);
      setInternal(false);
      onSent();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Could not send');
    } finally {
      setBusy(false);
    }
  }
  const typing = () => {
    if (Date.now() - lastTyping.current > 2500) {
      lastTyping.current = Date.now();
      onTyping?.();
      api(`/api/support/tickets/${encodeURIComponent(ticketId)}/typing`, { body: {} }).catch(
        () => {},
      );
    }
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        className="min-h-0 flex-1 space-y-1 overflow-y-auto bg-canvas/60 px-4 py-5 sm:px-6"
        aria-live="polite"
        aria-label="Conversation"
      >
        {visible.map((m, i) => {
          const prev = visible[i - 1];
          const newDay = !prev || day(prev.at) !== day(m.at);
          const sameAsPrev = prev && prev.from === m.from && prev.author === m.author && !newDay;
          return (
            <div key={m.id} className={sameAsPrev ? 'pt-0.5' : 'pt-3'}>
              {newDay && (
                <p className="mx-auto mb-3 w-fit rounded-full bg-surface px-3 py-1 text-[11px] font-semibold text-muted ring-1 ring-line">
                  {day(m.at)}
                </p>
              )}
              {m.from === 'system' ? (
                <p className="mx-auto w-fit max-w-[90%] rounded-full bg-line-soft px-3.5 py-1.5 text-center text-xs text-muted">
                  {m.body}
                </p>
              ) : (
                <Bubble m={m} mine={(m.from === 'agent') === (mode === 'admin')} />
              )}
            </div>
          );
        })}
        {userTyping && (
          <div className="pt-3">
            <Typing />
          </div>
        )}
        <div ref={end} />
      </div>
      <div className="space-y-3 border-t border-line bg-surface p-3 sm:p-4">
        {mode === 'admin' && (
          <SegmentedControl
            aria-label="Message type"
            variant="page"
            options={
              [
                { value: 'reply', label: 'Reply to user' },
                { value: 'note', label: 'Internal note' },
              ] as const
            }
            value={internal ? 'note' : 'reply'}
            onChange={(v) => setInternal(v === 'note')}
          />
        )}
        <TextArea
          hideLabel
          label="Message"
          rows={2}
          value={text}
          disabled={closed}
          onChange={(e) => {
            setText(e.target.value);
            typing();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              void send();
            }
          }}
          placeholder={
            closed
              ? 'This ticket is closed'
              : internal
                ? 'Internal note — only visible to the team'
                : 'Write a reply… (Ctrl/⌘ + Enter to send)'
          }
          className={cn(
            'max-h-40 min-h-[4.5rem] resize-none',
            internal && 'border-warn bg-warn-soft',
          )}
        />
        {files.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {files.map((f) => (
              <span
                key={f.name}
                className="inline-flex items-center gap-2 rounded-full bg-canvas py-1 pr-1 pl-3 text-xs"
              >
                <Icon name="download" size={12} />
                {f.name} · {kb(f.size)}
                <button
                  type="button"
                  aria-label={`Remove ${f.name}`}
                  onClick={() => setFiles((c) => c.filter((x) => x !== f))}
                  className="grid size-6 place-items-center rounded-full hover:bg-line"
                >
                  <Icon name="close" size={12} />
                </button>
              </span>
            ))}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2.5">
          <label className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-control border border-line-strong px-4 text-sm font-semibold text-link hover:bg-canvas">
            <Icon name="upload" size={16} />
            Attach
            <input
              type="file"
              hidden
              multiple
              accept={ALLOWED_TYPES.join(',')}
              onChange={(e) => {
                pick(e.target.files);
                e.target.value = '';
              }}
            />
          </label>
          {mode === 'admin' && quickReplies.length > 0 && (
            <Select
              aria-label="Quick replies"
              compact
              className="w-44 sm:w-56"
              value=""
              onChange={(e) => e.target.value && setText(e.target.value)}
              options={[
                { value: '', label: 'Quick replies…' },
                ...quickReplies.map((q) => ({ value: q, label: q.slice(0, 40) })),
              ]}
            />
          )}
          <Button
            className="ml-auto h-11"
            loading={busy}
            disabled={!text.trim() || closed}
            onClick={send}
          >
            {internal ? 'Add note' : 'Send'}
          </Button>
        </div>
      </div>
    </div>
  );
}
