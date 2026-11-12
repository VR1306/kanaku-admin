import { cn } from '@/utils/cn';

export type Tone = 'green' | 'red' | 'amber' | 'blue' | 'gray' | 'violet' | 'cyan';

const tones: Record<Tone, string> = {
  green: 'bg-ok-soft text-ok',
  red: 'bg-bad-soft text-bad',
  amber: 'bg-warn-soft text-warn',
  blue: 'bg-brand-soft text-link',
  gray: 'bg-line-soft text-muted',
  violet: 'bg-violet-soft text-violet',
  cyan: 'bg-cyan-soft text-cyan-deep',
};

export function Badge({ tone = 'gray', children }: { tone?: Tone; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold',
        tones[tone],
      )}
    >
      <span aria-hidden className="size-1.5 rounded-full bg-current" />
      {children}
    </span>
  );
}
