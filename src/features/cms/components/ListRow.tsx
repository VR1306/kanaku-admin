import { Icon } from '@/components/icons/icon';
import { cn } from '@/utils/cn';

/** A draggable list item: grip handle, content, and a right-hand controls area. Used by every CMS list. */
export function ListRow({
  children,
  controls,
  muted,
  tall,
}: {
  children: React.ReactNode;
  controls?: React.ReactNode;
  muted?: boolean;
  tall?: boolean;
}) {
  return (
    <div
      className={cn(
        'group flex gap-3 rounded-2xl border border-line bg-surface p-3.5 pr-4 transition-[border-color,box-shadow] hover:border-line-strong hover:shadow-sm',
        muted && 'bg-canvas/60',
        tall ? 'items-start' : 'items-center',
      )}
    >
      <span
        aria-hidden
        title="Drag to reorder"
        className={cn(
          'grid h-9 w-6 shrink-0 cursor-grab place-items-center text-subtle group-hover:text-muted active:cursor-grabbing',
          tall && 'mt-1',
        )}
      >
        <Icon name="grip" size={18} strokeWidth={2.6} />
      </span>
      <div className={cn('min-w-0 flex-1', muted && 'opacity-60')}>{children}</div>
      {controls && (
        <div className={cn('flex shrink-0 items-center gap-2', tall && 'pt-1')}>{controls}</div>
      )}
    </div>
  );
}

/** Small ↑ / ↓ buttons so reordering also works without a mouse. */
export function MoveButtons({
  onUp,
  onDown,
  disabledUp,
  disabledDown,
}: {
  onUp: () => void;
  onDown: () => void;
  disabledUp?: boolean;
  disabledDown?: boolean;
}) {
  const b =
    'grid size-8 place-items-center rounded-lg text-muted hover:bg-canvas hover:text-ink disabled:opacity-30';
  return (
    <div className="hidden flex-col sm:flex">
      <button type="button" aria-label="Move up" className={b} disabled={disabledUp} onClick={onUp}>
        <Icon name="chevronDown" size={14} strokeWidth={2.4} className="rotate-180" />
      </button>
      <button
        type="button"
        aria-label="Move down"
        className={b}
        disabled={disabledDown}
        onClick={onDown}
      >
        <Icon name="chevronDown" size={14} strokeWidth={2.4} />
      </button>
    </div>
  );
}

export function IconButton({
  label,
  danger,
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string; danger?: boolean }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      {...rest}
      className={cn(
        'grid size-10 place-items-center rounded-[10px] border border-line-strong bg-surface transition-colors disabled:opacity-40',
        danger ? 'text-bad hover:bg-bad-soft' : 'text-ink-2 hover:bg-canvas hover:text-link',
      )}
    >
      {children}
    </button>
  );
}

export function SubHeading({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-3">
      <div>
        <h3 className="font-display text-lg font-bold">{title}</h3>
        {hint && <p className="text-[13px] text-muted">{hint}</p>}
      </div>
      {action}
    </div>
  );
}
