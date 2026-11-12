'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { PasswordField } from '@/components/ui/Field';
import { api, ApiError } from '@/lib/api-client';
import { setPasswordSchema } from '../schemas/auth';
import { PasswordChecklist } from './ForgotForms';

/** Single-use invitation link (72h). Sets the password, then continues to MFA setup. */
export function AcceptInvite() {
  const router = useRouter();
  const token = useSearchParams().get('token') ?? '';
  const [who, setWho] = useState<{ name: string; email: string } | null>(null);
  const [error, setError] = useState('');
  const [pw, setPw] = useState({ a: '', b: '' });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<{ name: string; email: string }>(`/api/auth/invite?token=${encodeURIComponent(token)}`)
      .then(setWho)
      .catch((e) => setError(e instanceof ApiError ? e.message : 'Invalid invitation'));
  }, [token]);

  if (error && !who)
    return (
      <p role="alert" className="text-sm text-bad">
        {error}
      </p>
    );
  if (!who) return <p className="text-sm text-muted">Checking invitation…</p>;
  const ok = setPasswordSchema.safeParse({ password: pw.a }).success && pw.a === pw.b;
  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        try {
          const r = await api<{ next: string }>('/api/auth/invite', {
            body: { token, password: pw.a },
          });
          router.push(r.next);
        } catch (err) {
          setError(err instanceof ApiError ? err.message : 'Failed');
          setBusy(false);
        }
      }}
    >
      <h2 className="text-2xl font-extrabold">Welcome, {who.name}</h2>
      <p className="text-sm text-muted">
        Set a password for {who.email}. Next you&apos;ll set up two-step verification.
      </p>
      <PasswordField
        label="New password"
        placeholder="At least 8 characters"
        autoComplete="new-password"
        value={pw.a}
        onChange={(e) => setPw({ ...pw, a: e.target.value })}
      />
      <PasswordField
        label="Confirm password"
        placeholder="Re-enter your password"
        autoComplete="new-password"
        value={pw.b}
        onChange={(e) => setPw({ ...pw, b: e.target.value })}
        error={pw.b && pw.a !== pw.b ? 'Passwords do not match' : undefined}
      />
      <PasswordChecklist password={pw.a} />
      {error && (
        <p role="alert" className="text-sm text-bad">
          {error}
        </p>
      )}
      <Button type="submit" className="w-full" loading={busy} disabled={!ok}>
        Continue
      </Button>
    </form>
  );
}
