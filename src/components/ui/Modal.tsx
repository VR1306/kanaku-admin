'use client';

import { useEffect, useRef, useState } from 'react';
import { Icon, type IconName } from '@/components/icons/icon';
import { cn } from '@/utils/cn';
import { Button } from './Button';

interface ModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  /** Buttons for the pinned footer (usually Cancel + primary). */
  footer?: React.ReactNode;
  /** 'drawer' = right-hand slide-over (all add/edit forms). 'dialog' = small centred box (confirmations / action details). */
  variant?: 'dialog' | 'drawer';
  /** Drawer width: md 460px, lg 640px, xl 880px. */
  width?: 'md' | 'lg' | 'xl';
  subtitle?: string;
  /** Blocks closing while a save is in flight. */
  busy?: boolean;
}

const WIDTH = { md: '460px', lg: '640px', xl: '880px' } as const;
const EXIT_MS = 260;

/**
 * Native <dialog>: focus is trapped, Escape closes it, the page behind is inert and (via CSS) can't scroll.
 * Enter/exit are CSS animations; on close the dialog stays open just long enough to play the exit
 * (data-closing), then really closes — no abrupt unmounting, no layout shift.
 */
export function Modal({
  open,
  title,
  subtitle,
  onClose,
  children,
  footer,
  variant = 'dialog',
  width = 'md',
  busy,
}: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const openRef = useRef(open);
  // Keep the last content mounted while the exit animation plays (parents usually clear their state on close).
  // This is the documented "adjust state while rendering" pattern: it re-renders once with the same props, then settles.
  const [shown, setShown] = useState({ children, footer, title, subtitle });
  if (
    open &&
    (shown.children !== children ||
      shown.footer !== footer ||
      shown.title !== title ||
      shown.subtitle !== subtitle)
  ) {
    setShown({ children, footer, title, subtitle });
  }
  useEffect(() => {
    openRef.current = open;
  }, [open]);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open) {
      d.removeAttribute('data-closing');
      if (!d.open) {
        d.showModal();
        // Land on the first field (not the close button) so no stray focus ring shows on open.
        // (Skipped on touch devices so the on-screen keyboard doesn't pop up over the drawer.)
        requestAnimationFrame(
          () =>
            !matchMedia('(pointer: coarse)').matches &&
            d
              .querySelector<HTMLElement>(
                'input:not([type=hidden]):not([disabled]):not([type=radio]):not([type=checkbox]), select:not([disabled]), textarea:not([disabled])',
              )
              ?.focus(),
        );
      }
      return;
    }
    if (!d.open) return;
    d.setAttribute('data-closing', '');
    const t = setTimeout(() => {
      d.close();
      d.removeAttribute('data-closing');
    }, EXIT_MS);
    return () => clearTimeout(t);
  }, [open]);

  const drawer = variant === 'drawer';
  const close = () => !busy && onClose();
  const c = shown;
  return (
    <dialog
      ref={ref}
      aria-label={c.title}
      onClose={() => {
        if (openRef.current) onClose();
      }}
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
      onClick={(e) => {
        if (e.target === ref.current) close();
      }}
      style={drawer ? ({ '--drawer-w': WIDTH[width] } as React.CSSProperties) : undefined}
      className={cn(
        'bg-surface p-0 text-ink backdrop:bg-navy/60 backdrop:backdrop-blur-sm',
        drawer
          ? 'drawer'
          : 'm-auto w-[calc(100%-2rem)] max-w-[480px] rounded-card border border-line',
      )}
    >
      <div className={cn('flex flex-col', drawer ? 'h-full' : 'max-h-[calc(100dvh-2rem)]')}>
        <div
          className={cn(
            'flex items-start justify-between gap-4',
            drawer
              ? 'border-b border-line-soft px-5 pt-6 pb-4 sm:px-8 sm:pt-8 sm:pb-5'
              : 'px-6 pt-6 sm:px-7 sm:pt-7',
          )}
        >
          <div className="min-w-0">
            <h2
              className={cn(
                'font-display font-bold',
                drawer ? 'text-[24px] leading-tight sm:text-[26px]' : 'text-2xl',
              )}
            >
              {c.title}
            </h2>
            {c.subtitle && <p className="mt-1 text-sm text-muted">{c.subtitle}</p>}
          </div>
          <button
            type="button"
            aria-label="Close"
            disabled={busy}
            onClick={close}
            className="grid size-11 shrink-0 place-items-center rounded-[12px] bg-canvas text-link transition-colors hover:brightness-95 disabled:opacity-50"
          >
            <Icon name="close" size={18} strokeWidth={2.2} />
          </button>
        </div>
        <div
          className={cn(
            'min-h-0 flex-1 space-y-5 overflow-y-auto',
            drawer ? 'px-5 py-5 sm:px-8 sm:py-6' : 'px-6 py-5 sm:px-7',
          )}
        >
          {c.children}
        </div>
        {c.footer && (
          <div
            className={cn(
              'flex gap-3 border-t border-line-soft',
              drawer
                ? 'flex-wrap bg-surface px-5 py-4 sm:px-8 sm:py-5 [&>*]:min-w-[8rem] [&>*]:flex-1'
                : 'flex-col-reverse px-6 py-5 sm:flex-row sm:justify-end sm:px-7',
            )}
          >
            {c.footer}
          </div>
        )}
      </div>
    </dialog>
  );
}

interface ConfirmProps {
  open: boolean;
  title: string;
  body: React.ReactNode;
  confirmLabel: string;
  cancelLabel?: string;
  icon?: IconName;
  tone?: 'danger' | 'primary';
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Centred confirmation for destructive / sensitive actions. */
export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel,
  cancelLabel = 'Cancel',
  icon,
  tone = 'danger',
  loading,
  onConfirm,
  onCancel,
}: ConfirmProps) {
  return (
    <Modal
      open={open}
      title={title}
      busy={loading}
      onClose={onCancel}
      footer={
        <>
          <Button variant="outline" onClick={onCancel} disabled={loading}>
            {cancelLabel}
          </Button>
          <Button variant={tone} loading={loading} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex gap-4">
        <span
          className={cn(
            'grid size-12 shrink-0 place-items-center rounded-[14px]',
            tone === 'danger' ? 'bg-bad-soft text-bad' : 'bg-brand-soft text-link',
          )}
        >
          <Icon name={icon ?? (tone === 'danger' ? 'warning' : 'help')} size={24} />
        </span>
        <div className="min-w-0 text-[15px] text-muted">{body}</div>
      </div>
    </Modal>
  );
}
