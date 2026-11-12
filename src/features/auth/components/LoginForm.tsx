'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { PasswordField, TextField } from '@/components/ui/Field';
import { api, ApiError } from '@/lib/api-client';
import { loginSchema } from '../schemas/auth';

export function LoginForm() {
  const router = useRouter();
  const [values, setValues] = useState({ email: '', password: '', remember: false });
  const [touched, setTouched] = useState({ email: false, password: false });
  const [serverError, setServerError] = useState('');
  const [busy, setBusy] = useState(false);

  const parsed = loginSchema.safeParse(values);
  const fieldErr = (k: 'email' | 'password') =>
    touched[k] && !parsed.success
      ? parsed.error.issues.find((i) => i.path[0] === k)?.message
      : undefined;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!parsed.success) return;
    setBusy(true);
    setServerError('');
    try {
      const r = await api<{ next: string }>('/api/auth/login', { body: parsed.data });
      router.push(r.next);
    } catch (err) {
      setServerError(err instanceof ApiError ? err.message : 'Could not sign in');
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate className="w-full max-w-sm space-y-4">
      <h2 className="text-3xl font-extrabold">Admin sign in</h2>
      <p className="text-sm text-muted">
        Use your work email. You&apos;ll confirm with a code next.
      </p>
      <TextField
        label="Work email"
        type="email"
        autoComplete="username"
        placeholder="you@example.com"
        value={values.email}
        onChange={(e) => setValues({ ...values, email: e.target.value })}
        onBlur={() => setTouched((t) => ({ ...t, email: true }))}
        error={fieldErr('email')}
      />
      <div>
        <div className="mb-1 flex justify-end">
          <Link href="/forgot-password" className="text-xs font-bold text-link underline">
            Forgot password?
          </Link>
        </div>
        <PasswordField
          label="Password"
          placeholder="Enter your password"
          autoComplete="current-password"
          value={values.password}
          onChange={(e) => setValues({ ...values, password: e.target.value })}
          onBlur={() => setTouched((t) => ({ ...t, password: true }))}
          error={fieldErr('password')}
        />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={values.remember}
          onChange={(e) => setValues({ ...values, remember: e.target.checked })}
        />
        Keep me signed in on this device
      </label>
      {serverError && (
        <p role="alert" className="rounded-xl bg-bad-soft px-3 py-2 text-sm font-medium text-bad">
          {serverError}
        </p>
      )}
      <Button type="submit" className="w-full" loading={busy} disabled={!parsed.success}>
        Continue
      </Button>
    </form>
  );
}
