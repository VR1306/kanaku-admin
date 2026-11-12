'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { PasswordField, TextField } from '@/components/ui/Field';
import { api, ApiError } from '@/lib/api-client';
import { forgotSchema, passwordRules, resetSchema } from '../schemas/auth';

export function ForgotForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const valid = forgotSchema.safeParse({ email }).success;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const r = await api<{ devCode?: string }>('/api/auth/forgot', { body: { email } });
      const q = new URLSearchParams({ email });
      if (r.devCode) q.set('dev', r.devCode);
      router.push(`/forgot-password/sent?${q}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong');
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} className="space-y-4">
      <h2 className="text-2xl font-extrabold">Reset your password</h2>
      <p className="text-sm text-muted">
        We&apos;ll email a 6-digit code to your work address. Same steps as the user app.
      </p>
      <TextField
        label="Work email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
      />
      {error && (
        <p role="alert" className="text-sm text-bad">
          {error}
        </p>
      )}
      <Button type="submit" className="w-full" loading={busy} disabled={!valid}>
        Send reset code
      </Button>
      <Link href="/login" className="block text-center text-sm font-bold text-link underline">
        ← Back to sign in
      </Link>
    </form>
  );
}

export function ForgotSent() {
  const sp = useSearchParams();
  const email = sp.get('email') ?? '';
  const dev = sp.get('dev');
  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-extrabold">Check your inbox</h2>
      <p className="text-sm text-muted">
        If that address belongs to a team member, we&apos;ve sent a 6-digit code. It expires in 15
        minutes.
      </p>
      {dev && (
        <p className="rounded-xl bg-warn-soft p-3 text-xs text-warn">
          Dev only: your code is <b>{dev}</b>
        </p>
      )}
      <Link
        href={`/reset-password?email=${encodeURIComponent(email)}`}
        className="block rounded-xl bg-brand py-3 text-center text-sm font-semibold text-white"
      >
        Enter code
      </Link>
      <Link href="/forgot-password" className="block text-center text-sm font-bold text-link">
        Didn&apos;t get it? Resend
      </Link>
      <Link href="/login" className="block text-center text-sm font-bold text-link underline">
        ← Back to sign in
      </Link>
    </div>
  );
}

export function ResetForm() {
  const router = useRouter();
  const sp = useSearchParams();
  const [v, setV] = useState({ email: sp.get('email') ?? '', code: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const parsed = resetSchema.safeParse(v);
  const mismatch = v.confirm.length > 0 && v.confirm !== v.password;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!parsed.success || mismatch || v.confirm !== v.password) return;
    setBusy(true);
    setError('');
    try {
      await api('/api/auth/reset', {
        body: { email: v.email, code: v.code, password: v.password },
      });
      router.push('/login');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not reset password');
      setBusy(false);
    }
  }
  return (
    <form onSubmit={submit} className="space-y-4">
      <h2 className="text-2xl font-extrabold">Set a new password</h2>
      <TextField
        label="Work email"
        placeholder="you@example.com"
        type="email"
        value={v.email}
        onChange={(e) => setV({ ...v, email: e.target.value })}
      />
      <TextField
        label="Reset code"
        placeholder="6-digit code"
        inputMode="numeric"
        maxLength={6}
        value={v.code}
        onChange={(e) => setV({ ...v, code: e.target.value.replace(/\D/g, '') })}
      />
      <PasswordField
        label="New password"
        placeholder="At least 8 characters"
        autoComplete="new-password"
        value={v.password}
        onChange={(e) => setV({ ...v, password: e.target.value })}
      />
      <PasswordField
        label="Confirm password"
        placeholder="Re-enter your password"
        autoComplete="new-password"
        value={v.confirm}
        onChange={(e) => setV({ ...v, confirm: e.target.value })}
        error={mismatch ? 'Passwords do not match' : undefined}
      />
      <PasswordChecklist password={v.password} />
      {error && (
        <p role="alert" className="text-sm text-bad">
          {error}
        </p>
      )}
      <Button
        type="submit"
        className="w-full"
        loading={busy}
        disabled={!parsed.success || v.confirm !== v.password}
      >
        Update password
      </Button>
    </form>
  );
}

export function PasswordChecklist({ password }: { password: string }) {
  return (
    <ul className="space-y-0.5 text-xs" aria-label="Password requirements">
      {passwordRules.map((r) => (
        <li key={r.id} className={r.test(password) ? 'text-ok' : 'text-muted'}>
          {r.test(password) ? '✓' : '○'} {r.label}
        </li>
      ))}
    </ul>
  );
}
