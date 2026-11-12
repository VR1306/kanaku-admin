import { cn } from '@/utils/cn';

/** Same mark as the user app and marketing site: cyan tile, navy bars. */
export function Logo({
  tone = 'dark',
  size = 38,
  markOnly,
  admin,
  className,
}: {
  tone?: 'dark' | 'light';
  size?: number;
  markOnly?: boolean;
  admin?: boolean;
  className?: string;
}) {
  return (
    <span className={cn('inline-flex items-center gap-3', className)}>
      <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
        <rect width="32" height="32" rx="9" className="fill-cyan" />
        <path d="M8 15h4v8H8zM14 9h4v14h-4zM20 12h4v11h-4z" className="fill-on-accent" />
      </svg>
      <span
        aria-hidden={markOnly}
        className={cn(
          'flex items-center gap-2 whitespace-nowrap transition-opacity duration-200',
          markOnly && 'opacity-0',
        )}
      >
        <span
          className={cn(
            'font-display text-[26px] leading-none font-bold',
            tone === 'dark' ? 'text-on-inverse' : 'text-ink',
          )}
        >
          Kanaku
        </span>
        {admin && (
          <span className="rounded-full bg-cyan px-2 py-0.5 text-[11px] font-bold tracking-[0.12em] text-on-accent">
            ADMIN
          </span>
        )}
      </span>
    </span>
  );
}
