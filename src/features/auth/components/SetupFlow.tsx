'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { PasswordField, TextField } from '@/components/ui/Field';
import { api, ApiError } from '@/lib/api-client';
import { confirmMfaSchema, setPasswordSchema } from '../schemas/auth';
import { PasswordChecklist } from './ForgotForms';

type Status = { needsPassword: boolean; needsMfa: boolean; email: string };

/** First-time administrator setup: (1) new password → (2) authenticator QR → (3) 8 backup codes → dashboard. */
export function SetupFlow() {
  const router = useRouter();
  const [status, setStatus] = useState<Status | null>(null);
  const [pwDone, setPwDone] = useState(false);
  const [qr, setQr] = useState<{ secret: string; qr: string } | null>(null);
  const [codes, setCodes] = useState<string[] | null>(null);
  const [pw, setPw] = useState({ a: '', b: '' });
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api<Status>('/api/auth/setup')
      .then(setStatus)
      .catch(() => router.push('/login'));
  }, [router]);

  const needPw = status?.needsPassword && !pwDone;
  useEffect(() => {
    if (status && !needPw && status.needsMfa && !qr && !codes)
      api<{ secret: string; qr: string }>('/api/auth/mfa/setup')
        .then(setQr)
        .catch(() => setError('Could not load QR code'));
  }, [status, needPw, qr, codes]);

  const guard = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError('');
    try {
      await fn();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };
  const finish = () =>
    guard(async () => {
      await api('/api/auth/setup/complete', { body: {} });
      router.push('/');
      router.refresh();
    });

  if (!status) return <p className="text-sm text-muted">Loading…</p>;

  if (needPw) {
    const ok = setPasswordSchema.safeParse({ password: pw.a }).success && pw.a === pw.b;
    return (
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          guard(async () => {
            await api('/api/auth/setup/password', { body: { password: pw.a } });
            setPwDone(true);
          });
        }}
      >
        <p className="text-xs font-bold tracking-widest text-muted">STEP 1 OF 3</p>
        <h2 className="text-2xl font-extrabold">Choose a new password</h2>
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

  if (codes) {
    return (
      <div className="space-y-4">
        <p className="text-xs font-bold tracking-widest text-muted">STEP 3 OF 3</p>
        <h2 className="text-2xl font-extrabold">Save your backup codes</h2>
        <p className="text-sm text-muted">
          Each code works once if you lose your phone. They won&apos;t be shown again.
        </p>
        <ul className="grid grid-cols-2 gap-2 rounded-xl bg-canvas p-4 font-mono text-sm">
          {codes.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
        <Button
          variant="outline"
          className="w-full"
          onClick={() => navigator.clipboard?.writeText(codes.join('\n'))}
        >
          Copy codes
        </Button>
        {error && (
          <p role="alert" className="text-sm text-bad">
            {error}
          </p>
        )}
        <Button className="w-full" loading={busy} onClick={finish}>
          I&apos;ve saved them — go to dashboard
        </Button>
      </div>
    );
  }

  if (status.needsMfa) {
    return (
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          guard(async () => {
            const r = await api<{ backupCodes: string[] }>('/api/auth/mfa/setup', {
              body: { code },
            });
            setCodes(r.backupCodes);
          });
        }}
      >
        <p className="text-xs font-bold tracking-widest text-muted">STEP 2 OF 3</p>
        <h2 className="text-2xl font-extrabold">Set up two-step verification</h2>
        <p className="text-sm text-muted">
          Scan the QR code with an authenticator app, then enter the 6-digit code.
        </p>
        {qr ? (
          <div className="flex flex-col items-center gap-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qr.qr}
              alt="Authenticator QR code"
              width={240}
              height={240}
              className="rounded-xl border border-line bg-white p-2"
            />
            <p className="text-xs text-muted">
              Can&apos;t scan? In Google Authenticator tap + → Enter a setup key, account
              &quot;Kanaku Admin&quot;, type: Time based, and enter:
            </p>
            <code className="rounded-lg bg-canvas px-3 py-2 font-mono text-sm tracking-wider break-all select-all">
              {qr.secret.match(/.{1,4}/g)?.join(' ')}
            </code>
          </div>
        ) : (
          <p className="text-sm text-muted">Loading QR code…</p>
        )}
        <TextField
          label="6-digit code"
          placeholder="e.g. 123456"
          inputMode="numeric"
          maxLength={6}
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
        />
        {error && (
          <p role="alert" className="text-sm text-bad">
            {error}
          </p>
        )}
        <Button
          type="submit"
          className="w-full"
          loading={busy}
          disabled={!confirmMfaSchema.safeParse({ code }).success}
        >
          Verify
        </Button>
      </form>
    );
  }

  return (
    <div className="space-y-4">
      <h2 className="text-2xl font-extrabold">All set</h2>
      {error && (
        <p role="alert" className="text-sm text-bad">
          {error}
        </p>
      )}
      <Button className="w-full" loading={busy} onClick={finish}>
        Go to dashboard
      </Button>
    </div>
  );
}
