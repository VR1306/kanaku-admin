'use client';

import Link from 'next/link';
import { useEffect, useId, useRef, useState, useSyncExternalStore } from 'react';
import { AnimatePresence, m as motion } from 'framer-motion';
import { createPortal } from 'react-dom';
import { Icon, type IconName } from '@/components/icons/icon';
import { cn } from '@/utils/cn';

export interface MenuAction {
  label: string;
  icon?: IconName;
  href?: string;
  onSelect?: () => void;
  danger?: boolean;
  disabled?: boolean;
}

/**
 * Row actions in a "⋯" menu. Rendered in a portal with fixed positioning so it is never clipped by a scrolling table,
 * closes on Escape / outside click / scroll, and supports arrow-key navigation.
 */
export function ActionMenu({ label, actions }: { label: string; actions: MenuAction[] }) {
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);
  const btn = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLUListElement>(null);
  const id = useId();
  // Portals need `document`; this is false on the server and true after hydration.
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );
  const items = actions.filter(Boolean);

  const close = () => {
    setPos(null);
    btn.current?.focus();
  };
  useEffect(() => {
    if (!pos) return;
    menu.current?.querySelector<HTMLElement>('[role=menuitem]:not([aria-disabled=true])')?.focus();
    const away = (e: MouseEvent) => {
      if (!menu.current?.contains(e.target as Node) && !btn.current?.contains(e.target as Node))
        setPos(null);
    };
    const hide = () => setPos(null);
    document.addEventListener('mousedown', away);
    window.addEventListener('scroll', hide, true);
    window.addEventListener('resize', hide);
    return () => {
      document.removeEventListener('mousedown', away);
      window.removeEventListener('scroll', hide, true);
      window.removeEventListener('resize', hide);
    };
  }, [pos]);

  const open = () => {
    const r = btn.current!.getBoundingClientRect();
    const h = items.length * 40 + 16;
    setPos({
      top: r.bottom + h > window.innerHeight ? Math.max(8, r.top - h - 4) : r.bottom + 4,
      right: window.innerWidth - r.right,
    });
  };
  const onKey = (e: React.KeyboardEvent) => {
    const els = [
      ...(menu.current?.querySelectorAll<HTMLElement>(
        '[role=menuitem]:not([aria-disabled=true])',
      ) ?? []),
    ];
    const i = els.indexOf(document.activeElement as HTMLElement);
    if (e.key === 'Escape') {
      e.preventDefault();
      close();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      els[(i + 1) % els.length]?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      els[(i - 1 + els.length) % els.length]?.focus();
    }
  };

  const dangerStart = items.findIndex((a) => a.danger);
  return (
    <>
      <button
        ref={btn}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={!!pos}
        aria-controls={pos ? id : undefined}
        onClick={() => (pos ? setPos(null) : open())}
        className={cn(
          'grid size-10 place-items-center rounded-[10px] border border-line-strong bg-surface text-ink-2 transition-colors hover:border-brand hover:text-link',
          pos && 'border-brand text-link',
        )}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <circle cx="5" cy="12" r="1.8" />
          <circle cx="12" cy="12" r="1.8" />
          <circle cx="19" cy="12" r="1.8" />
        </svg>
      </button>
      {mounted &&
        createPortal(
          <AnimatePresence>
            {pos && (
              <motion.ul
                ref={menu}
                id={id}
                role="menu"
                aria-label={label}
                onKeyDown={onKey}
                style={{ top: pos.top, right: pos.right }}
                initial={{ opacity: 0, y: -6, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -4, scale: 0.98 }}
                transition={{ duration: 0.14 }}
                className="fixed z-[60] w-52 rounded-[14px] border border-line bg-surface p-1.5 shadow-[0_12px_40px_rgb(0_0_0/0.16)]"
              >
                {items.map((a, i) => {
                  const cls = cn(
                    'flex h-10 w-full items-center gap-2.5 rounded-[9px] px-3 text-left text-sm font-semibold transition-colors',
                    a.danger ? 'text-bad hover:bg-bad-soft' : 'text-ink hover:bg-canvas',
                    a.disabled && 'pointer-events-none opacity-45',
                  );
                  const inner = (
                    <>
                      {a.icon && <Icon name={a.icon} size={16} />}
                      {a.label}
                    </>
                  );
                  return (
                    <li
                      key={a.label}
                      role="none"
                      className={
                        i === dangerStart && i > 0
                          ? 'mt-1 border-t border-line-soft pt-1'
                          : undefined
                      }
                    >
                      {a.href ? (
                        <Link
                          role="menuitem"
                          href={a.href}
                          tabIndex={-1}
                          aria-disabled={a.disabled}
                          className={cls}
                          onClick={() => setPos(null)}
                        >
                          {inner}
                        </Link>
                      ) : (
                        <button
                          role="menuitem"
                          type="button"
                          tabIndex={-1}
                          aria-disabled={a.disabled}
                          className={cls}
                          onClick={() => {
                            setPos(null);
                            a.onSelect?.();
                          }}
                        >
                          {inner}
                        </button>
                      )}
                    </li>
                  );
                })}
              </motion.ul>
            )}
          </AnimatePresence>,
          document.body,
        )}
    </>
  );
}

/** A visible labelled button for the single main row action (e.g. "Edit"). */
export function RowButton({
  children,
  danger,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { danger?: boolean }) {
  return (
    <button
      type="button"
      {...rest}
      className={cn(
        'h-10 rounded-[10px] border px-4 text-sm font-semibold transition-colors disabled:opacity-50',
        danger
          ? 'border-bad/30 text-bad hover:bg-bad-soft'
          : 'border-line-strong bg-surface text-link hover:bg-canvas',
        rest.className,
      )}
    >
      {children}
    </button>
  );
}
