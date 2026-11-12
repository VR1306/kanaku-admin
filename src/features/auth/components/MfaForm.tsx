'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/Field';
import { api, ApiError } from '@/lib/api-client';
import { mfaSchema } from '../schemas/auth';

export function MfaForm() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);
  const [wait, setWait] = useState(0);
  const valid = mfaSchema.safeParse({ code }).success;

  useEffect(() => {
    if (wait <= 0) return;
    const t = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(t);
  }, [wait]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    setBusy(true);
    setError('');
    try {
      const r = await api<{ next: string }>('/api/auth/mfa', { body: { code } });
      router.push(r.next);
      router.refresh();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Verification failed');
      setBusy(false);
    }
  }

  async function emailMe() {
    setError('');
    try {
      const r = await api<{ sentTo: string; devCode?: string }>('/api/auth/mfa/email', {
        body: {},
      });
      setInfo(
        `We sent a 6-digit code to ${r.sentTo}. It expires in 10 minutes.${r.devCode ? ` (dev code: ${r.devCode})` : ''}`,
      );
      setWait(30);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not send code');
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <h2 className="text-2xl font-extrabold">Two-step verification</h2>
      <p className="text-sm text-muted">
        Enter the 6-digit code from your authenticator app, or a backup code.
      </p>
      <TextField
        label="Verification code"
        placeholder="6-digit code or backup code"
        inputMode="text"
        autoComplete="one-time-code"
        maxLength={8}
        value={code}
        onChange={(e) => setCode(e.target.value.trim())}
      />
      {info && (
        <p role="status" className="rounded-xl bg-brand-soft p-3 text-sm text-link">
          {info}
        </p>
      )}
      {error && (
        <p role="alert" className="text-sm font-medium text-bad">
          {error}
        </p>
      )}
      <Button type="submit" className="w-full" loading={busy} disabled={!valid}>
        Verify and sign in
      </Button>
      <div className="flex items-center justify-between text-sm">
        <button
          type="button"
          disabled={wait > 0}
          onClick={emailMe}
          className="font-bold text-link disabled:text-muted"
        >
          {wait > 0 ? `Resend in 0:${String(wait).padStart(2, '0')}` : 'Email me a code instead'}
        </button>
        <span className="text-xs text-muted">Max 5 attempts</span>
      </div>
      <p className="text-xs text-muted">
        Lost your phone? Use a backup code or ask a Super Admin to reset MFA.
      </p>
    </form>
  );
}
