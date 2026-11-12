'use client';

import { motion, type HTMLMotionProps } from 'framer-motion';
import { SPRING } from '@/constants/motion';
import { cn } from '@/utils/cn';
import { Spinner } from './Spinner';

type Variant = 'primary' | 'cyan' | 'outline' | 'outlineDanger' | 'danger' | 'ghost';

const VARIANTS: Record<Variant, string> = {
  primary: 'bg-brand text-white hover:brightness-110',
  cyan: 'bg-cyan text-on-accent hover:brightness-110',
  outline: 'border border-line-strong bg-surface text-link hover:bg-canvas',
  outlineDanger: 'border border-bad/40 bg-surface text-bad hover:bg-bad-soft',
  danger: 'bg-bad text-white hover:brightness-110',
  ghost: 'text-link hover:bg-brand-soft',
};

export interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'children'> {
  variant?: Variant;
  loading?: boolean;
  children?: React.ReactNode;
}

/** Same press/hover motion and sizing as the user app's Button. Pass an `h-*` class for compact table buttons. */
export function Button({
  variant = 'primary',
  loading,
  disabled,
  className,
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  const off = disabled || loading;
  const customHeight = /(^|\s)h-/.test(className ?? '');
  return (
    <motion.button
      type={type}
      whileHover={off ? undefined : { y: -1 }}
      whileTap={off ? undefined : { scale: 0.98 }}
      transition={SPRING}
      disabled={off}
      aria-busy={loading || undefined}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-control px-6 text-[15px] font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-60',
        customHeight ? '' : 'h-[52px]',
        VARIANTS[variant],
        className,
      )}
      {...rest}
    >
      {loading && <Spinner size={16} />}
      {children}
    </motion.button>
  );
}
