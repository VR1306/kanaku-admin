'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon } from '@/components/icons/icon';
import { useRealtime } from '@/hooks/useRealtime';
import { api } from '@/lib/api-client';
import { cn } from '@/utils/cn';

interface Item {
  id: string;
  title: string;
  body: string;
  href: string | null;
  at: string;
  read: boolean;
}

/** Live notification bell: unread badge, history, mark-as-read. Updates instantly over the realtime socket. */
export function NotificationBell({ className }: { className?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Item[]>([]);
  const [unread, setUnread] = useState(0);
  const box = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    try {
      const r = await api<{ items: Item[]; unread: number }>('/api/notifications');
      setItems(r.items);
      setUnread(r.unread);
    } catch {
      /* the bell is non-critical */
    }
  }, []);
  useEffect(() => {
    const t = setTimeout(load, 0);
    return () => clearTimeout(t);
  }, [load]);

  useRealtime(
    {
      'notification:new': (n: Item) => {
        setItems((l) => [n, ...l.filter((x) => x.id !== n.id)].slice(0, 30));
        setUnread((u) => u + 1);
      },
      'notification:read': () => void load(),
    },
    load,
  );

  useEffect(() => {
    if (!open) return;
    const away = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', away);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', away);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);

  const read = async (id?: string) => {
    await api('/api/notifications', { body: id ? { id } : {} }).catch(() => {});
    void load();
  };

  return (
    <div ref={box} className={cn('relative', className)}>
      <button
        type="button"
        aria-label={unread ? `Notifications, ${unread} unread` : 'Notifications'}
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="relative grid size-10 place-items-center rounded-control bg-surface text-ink shadow-sm hover:bg-canvas"
      >
        <Icon name="bell" size={20} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 grid min-w-5 place-items-center rounded-full bg-bad px-1 text-[11px] leading-5 font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>
      {open && (
        <div
          role="dialog"
          aria-label="Notifications"
          className="absolute right-0 z-50 mt-2 w-[min(92vw,360px)] overflow-hidden rounded-2xl border border-line bg-surface text-ink shadow-lg"
        >
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <p className="text-sm font-bold">Notifications</p>
            <button
              type="button"
              disabled={!unread}
              onClick={() => read()}
              className="text-xs font-semibold text-primary disabled:opacity-40"
            >
              Mark all read
            </button>
          </div>
          <ul className="max-h-96 overflow-y-auto">
            {items.length === 0 && (
              <li className="px-4 py-8 text-center text-sm text-muted">
                You&apos;re all caught up.
              </li>
            )}
            {items.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => {
                    void read(n.id);
                    setOpen(false);
                    if (n.href) router.push(n.href);
                  }}
                  className={cn(
                    'flex w-full gap-3 border-b border-line px-4 py-3 text-left last:border-0 hover:bg-canvas',
                    !n.read && 'bg-primary/5',
                  )}
                >
                  <span
                    aria-hidden
                    className={cn(
                      'mt-1.5 size-2 shrink-0 rounded-full',
                      n.read ? 'bg-transparent' : 'bg-primary',
                    )}
                  />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold">{n.title}</span>
                    <span className="line-clamp-2 text-xs text-muted">{n.body}</span>
                    <span className="mt-1 block text-[11px] text-muted">
                      {new Date(n.at).toLocaleString('en-IN', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
