'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/Field';
import { api, ApiError } from '@/lib/api-client';
import { mfaSchema } from '../schemas/auth';
import { CodeInput } from './CodeInput';

/** Two-step sign-in, laid out like the User App's: six digit boxes, one primary button, small helper links. */
export function MfaForm() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [backup, setBackup] = useState(false); // backup codes are 8 characters, not 6 digits
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [busy, setBusy] = useState(false);
  const [wait, setWait] = useState(0);
  const valid = backup ? mfaSchema.safeParse({ code }).success : code.length === 6;

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
      setBackup(false);
      setCode('');
      setWait(30);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not send code');
    }
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <div>
        <h2 className="text-[28px] leading-tight font-extrabold">Two-step verification</h2>
        <p className="mt-3 text-base text-muted">
          {backup
            ? 'Enter one of your 8-character backup codes.'
            : 'Open Google Authenticator and enter the 6-digit code for Kanaku Admin.'}
        </p>
      </div>
      {backup ? (
        <TextField
          label="Backup code"
          placeholder="e.g. 3f9a12bc"
          autoComplete="off"
          autoFocus
          maxLength={8}
          value={code}
          error={error}
          onChange={(e) => setCode(e.target.value.trim())}
        />
      ) : (
        <CodeInput value={code} onChange={setCode} error={error} autoFocus />
      )}
      {info && (
        <p role="status" className="rounded-xl bg-brand-soft p-3 text-sm text-link">
          {info}
        </p>
      )}
      <Button type="submit" className="h-14 w-full" loading={busy} disabled={!valid}>
        Verify and sign in
      </Button>
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <button
          type="button"
          disabled={wait > 0}
          onClick={emailMe}
          className="font-semibold text-link disabled:text-muted"
        >
          {wait > 0 ? `Resend in 0:${String(wait).padStart(2, '0')}` : 'Email me a code instead'}
        </button>
        <button
          type="button"
          onClick={() => {
            setBackup(!backup);
            setCode('');
            setError('');
          }}
          className="font-semibold text-link"
        >
          {backup ? 'Use authenticator code' : 'Use a backup code'}
        </button>
      </div>
      <p className="text-xs text-muted">
        Max 5 attempts. Lost your phone? Use a backup code or ask a Super Admin to reset MFA.
      </p>
    </form>
  );
}
