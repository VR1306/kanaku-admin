'use client';

import {
  useState,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { motion } from 'framer-motion';
import { Icon } from '@/components/icons/icon';
import { FOCUS_FIELD } from '@/constants/styles';
import { cn } from '@/utils/cn';

/*
 * Form controls — visually identical to the Kanaku user app (54px inputs, 52px selects, 14px radius,
 * cyan focus ring, shaking error text, show/hide password). Every form in the admin uses these.
 */
interface FieldShell {
  label: string;
  error?: string;
  hint?: string;
  labelAction?: ReactNode;
  /** Keep the label for screen readers only (e.g. chat composer). */
  hideLabel?: boolean;
}

const fieldId = (label: string, id?: string) =>
  id ?? `f-${label.replace(/\W+/g, '-').toLowerCase()}`;

/** Label + control + helper/error text wrapper. */
export function Field({
  id,
  label,
  error,
  hint,
  labelAction,
  hideLabel,
  children,
}: FieldShell & { id: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between">
        <label
          htmlFor={id}
          className={cn('text-sm font-semibold text-ink', hideLabel && 'sr-only')}
        >
          {label}
        </label>
        {labelAction}
      </div>
      {children}
      {error ? (
        <motion.p
          key={error}
          id={`${id}-e`}
          role="alert"
          className="text-[13px] text-bad"
          initial={{ opacity: 0, x: -6 }}
          animate={{ opacity: 1, x: [-6, 4, -2, 0] }}
          transition={{ duration: 0.35 }}
        >
          {error}
        </motion.p>
      ) : hint ? (
        <p id={`${id}-h`} className="text-[13px] text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

export const controlClasses = `h-[54px] w-full rounded-control border bg-surface px-4 text-[15px] text-ink placeholder:text-subtle transition-colors disabled:bg-canvas disabled:text-muted ${FOCUS_FIELD}`;

type InputProps = InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean };
export function Input({ invalid, className, ...rest }: InputProps) {
  return (
    <input
      aria-invalid={invalid || undefined}
      className={cn(controlClasses, invalid ? 'border-bad' : 'border-line-strong', className)}
      {...rest}
    />
  );
}

export function TextField({
  label,
  error,
  hint,
  labelAction,
  id,
  className,
  ...rest
}: FieldShell & InputHTMLAttributes<HTMLInputElement>) {
  const fid = fieldId(label, id);
  return (
    <Field id={fid} label={label} error={error} hint={hint} labelAction={labelAction}>
      <Input
        id={fid}
        invalid={!!error}
        aria-describedby={error ? `${fid}-e` : hint ? `${fid}-h` : undefined}
        className={className}
        {...rest}
      />
    </Field>
  );
}

export type SelectOption = { value: string; label: string };

/** Stand-alone select (no label) — used in toolbars. `compact` = 48px as in the user app's dashboard toolbar. */
export function Select({
  options,
  compact,
  className,
  ...rest
}: Omit<SelectHTMLAttributes<HTMLSelectElement>, 'children'> & {
  options: SelectOption[];
  compact?: boolean;
}) {
  return (
    <div className={cn('relative', className)}>
      <select
        className={cn(
          'w-full appearance-none rounded-control border border-line-strong bg-surface pr-10 pl-[14px] text-[15px] text-ink transition-colors',
          compact ? 'h-12' : 'h-[52px]',
          FOCUS_FIELD,
        )}
        {...rest}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <Icon
        name="chevronDown"
        size={16}
        strokeWidth={2}
        className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-ink"
      />
    </div>
  );
}

export function SelectField({
  label,
  error,
  hint,
  id,
  options,
  className,
  ...rest
}: FieldShell &
  Omit<SelectHTMLAttributes<HTMLSelectElement>, 'children'> & { options: SelectOption[] }) {
  const fid = fieldId(label, id);
  return (
    <Field id={fid} label={label} error={error} hint={hint}>
      <div className="relative">
        <select
          id={fid}
          aria-invalid={!!error || undefined}
          {...rest}
          className={cn(
            'h-[52px] w-full appearance-none rounded-control border bg-surface pr-11 pl-[14px] text-[15px] text-ink transition-colors',
            FOCUS_FIELD,
            error ? 'border-bad' : 'border-line-strong',
            className,
          )}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
        <Icon
          name="chevronDown"
          size={16}
          strokeWidth={2}
          className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 text-ink"
        />
      </div>
    </Field>
  );
}

export function TextArea({
  label,
  error,
  hint,
  hideLabel,
  id,
  className,
  ...rest
}: FieldShell & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const fid = fieldId(label, id);
  return (
    <Field id={fid} label={label} error={error} hint={hint} hideLabel={hideLabel}>
      <textarea
        id={fid}
        aria-invalid={!!error || undefined}
        {...rest}
        className={cn(
          'w-full rounded-control border bg-surface px-4 py-3 text-[15px] text-ink placeholder:text-subtle transition-colors',
          FOCUS_FIELD,
          error ? 'border-bad' : 'border-line-strong',
          className,
        )}
      />
    </Field>
  );
}

/** Password field with a show/hide toggle. */
export function PasswordField({
  label,
  error,
  hint,
  labelAction,
  id,
  className,
  ...rest
}: FieldShell & Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>) {
  const [visible, setVisible] = useState(false);
  const fid = fieldId(label, id);
  return (
    <Field id={fid} label={label} error={error} hint={hint} labelAction={labelAction}>
      <div className="relative">
        <Input
          id={fid}
          invalid={!!error}
          type={visible ? 'text' : 'password'}
          className={cn('pr-12', className)}
          {...rest}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
          className="absolute inset-y-0 right-2 grid w-10 place-items-center text-muted hover:text-ink"
        >
          <Icon name={visible ? 'eyeOff' : 'eye'} size={20} />
        </button>
      </div>
    </Field>
  );
}

/** Checkbox row styled to match (accent colour, 18px). */
export function Checkbox({
  label,
  className,
  ...rest
}: Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> & { label: ReactNode }) {
  return (
    <label className={cn('flex items-center gap-2.5 text-sm text-ink', className)}>
      <input type="checkbox" className="size-[18px] rounded-[4px] accent-brand" {...rest} />
      {label}
    </label>
  );
}
