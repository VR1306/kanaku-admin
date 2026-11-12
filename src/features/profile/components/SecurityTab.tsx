'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import { Icon } from '@/components/icons/icon';
import { Button } from '@/components/ui/Button';
import { PasswordField } from '@/components/ui/Field';
import { PasswordStrength } from '@/components/ui/PasswordStrength';
import { useToast } from '@/components/ui/Toast';
import { useApi } from '@/hooks/useApi';
import { api, ApiError } from '@/lib/api-client';
import { cn } from '@/utils/cn';
import { isMobileDevice } from '@/utils/device';
import { formatIST } from '@/utils/format';
import { PasswordChecklist } from '@/features/auth/components/ForgotForms';
import { passwordBody } from '../schemas/profile';
import type { Device, ProfileData } from '../types';
import { SectionShell } from './SectionShell';

function DeviceIcon({ device, className }: { device: string; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn('grid size-11 shrink-0 place-items-center rounded-[14px]', className)}
    >
      <Icon name={isMobileDevice(device) ? 'mobile' : 'desktop'} size={22} />
    </span>
  );
}

/** Layout, wording and behaviour follow the user app's Security section (password, 2-step status, this device, other sessions). */
export function SecurityTab({ profile }: { profile: ProfileData }) {
  const { toast } = useToast();
  const sessions = useApi<Device[]>('/api/auth/sessions');
  const [v, setV] = useState({ current: '', next: '', confirm: '' });
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState<string>();
  const [status, setStatus] = useState<{ tone: 'success' | 'danger'; text: string } | null>(null);
  const valid =
    passwordBody.safeParse({ current: v.current, next: v.next }).success && v.next === v.confirm;
  const current = sessions.data?.find((s) => s.current);
  const others = sessions.data?.filter((s) => !s.current) ?? [];

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    setSaving(true);
    setStatus(null);
    try {
      await api('/api/profile/password', { body: { current: v.current, next: v.next } });
      setStatus({ tone: 'success', text: 'Password changed. Other devices were signed out.' });
      setV({ current: '', next: '', confirm: '' });
      sessions.reload();
    } catch (x) {
      setStatus({
        tone: 'danger',
        text: x instanceof ApiError ? x.message : 'Couldn’t change it.',
      });
    } finally {
      setSaving(false);
    }
  }
  async function revoke(sid: string) {
    setBusy(sid);
    try {
      await api(`/api/auth/sessions/${sid}`, { method: 'DELETE' });
      sessions.reload();
    } catch (e) {
      setStatus({
        tone: 'danger',
        text: e instanceof ApiError ? e.message : 'Couldn’t sign it out.',
      });
    } finally {
      setBusy(undefined);
    }
  }
  async function revokeAll() {
    setBusy('all');
    try {
      await api('/api/auth/sessions/others', { body: {} });
      toast('All other sessions signed out');
      sessions.reload();
    } catch (e) {
      setStatus({
        tone: 'danger',
        text: e instanceof ApiError ? e.message : 'Couldn’t sign them out.',
      });
    } finally {
      setBusy(undefined);
    }
  }

  return (
    <SectionShell title="Security" formId="password-form" saving={saving} status={status}>
      <form
        id="password-form"
        onSubmit={save}
        noValidate
        className="grid grid-cols-1 gap-6 sm:grid-cols-2"
      >
        <PasswordField
          label="Current password"
          autoComplete="current-password"
          placeholder="Enter your current password"
          value={v.current}
          onChange={(e) => setV({ ...v, current: e.target.value })}
        />
        <div>
          <PasswordField
            label="New password"
            autoComplete="new-password"
            placeholder="At least 8 characters"
            value={v.next}
            onChange={(e) => setV({ ...v, next: e.target.value })}
          />
          {v.next && (
            <div className="mt-3">
              <PasswordStrength password={v.next} />
            </div>
          )}
        </div>
        <PasswordField
          label="Confirm new password"
          autoComplete="new-password"
          placeholder="Re-enter the new password"
          value={v.confirm}
          onChange={(e) => setV({ ...v, confirm: e.target.value })}
          error={v.confirm && v.confirm !== v.next ? 'Passwords do not match' : undefined}
        />
        <div className="self-end">
          <PasswordChecklist password={v.next} />
        </div>
      </form>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-canvas p-[18px]">
        <div className="flex min-w-0 flex-1 basis-[280px] items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-[12px] bg-ok-soft text-ok">
            <Icon name="team" size={20} />
          </span>
          <div>
            <p className="text-base font-bold">Two-step verification</p>
            <p className="text-sm text-muted">
              {profile.mfa
                ? 'On. A code from your authenticator app is required every time you sign in.'
                : 'Set up your authenticator app the next time you sign in.'}
            </p>
          </div>
        </div>
        <span
          className={cn(
            'shrink-0 rounded-full px-4 py-1.5 text-sm font-bold',
            profile.mfa ? 'bg-ok-soft text-ok' : 'bg-line text-muted',
          )}
        >
          {profile.mfa ? 'On' : 'Off'}
        </span>
      </div>

      <h3 className="mt-8 text-[17px] font-bold">Active sessions</h3>
      {current && (
        <div className="mt-3 flex flex-wrap items-center gap-4 rounded-2xl border-2 border-brand bg-brand-soft/50 p-4">
          <DeviceIcon device={current.device} className="bg-brand text-white" />
          <div className="min-w-0 flex-1 basis-[200px]">
            <p className="text-base font-bold">
              {current.device}
              <span className="ml-2 rounded-full bg-brand px-2.5 py-0.5 align-middle text-xs font-bold text-white">
                This device
              </span>
            </p>
            <p className="mt-0.5 text-sm text-muted">
              Signed in {formatIST(current.created)} · {current.ip}
            </p>
          </div>
          <span className="rounded-full bg-ok-soft px-3.5 py-1 text-sm font-semibold text-ok">
            Active now
          </span>
        </div>
      )}

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <h4 className="text-sm font-bold tracking-[0.08em] text-muted uppercase">
          Other sessions{others.length > 0 ? ` (${others.length})` : ''}
        </h4>
        <Button
          variant="outlineDanger"
          className="h-10"
          loading={busy === 'all'}
          disabled={others.length === 0}
          title={others.length === 0 ? 'No other devices are signed in' : undefined}
          onClick={() => void revokeAll()}
        >
          Revoke all other sessions
        </Button>
      </div>
      {others.length === 0 ? (
        <p className="mt-3 rounded-2xl border border-dashed border-line-strong px-4 py-5 text-sm text-muted">
          You&apos;re only signed in on this device. When you sign in somewhere else it appears
          here, and you can revoke that one session, or all of them, to sign the device out
          immediately.
        </p>
      ) : (
        <ul className="mt-3 flex flex-col gap-3">
          <AnimatePresence initial={false}>
            {others.map((s) => (
              <motion.li
                key={s.sid}
                layout
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: 24, transition: { duration: 0.2 } }}
                className="flex flex-wrap items-center gap-4 rounded-2xl border border-line bg-surface p-4"
              >
                <DeviceIcon device={s.device} className="bg-canvas text-ink-2" />
                <div className="min-w-0 flex-1 basis-[200px]">
                  <p className="text-base font-semibold">{s.device}</p>
                  <p className="mt-0.5 text-sm text-muted">
                    Signed in {formatIST(s.created)} · Last active {formatIST(s.last)} · {s.ip}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={busy === s.sid}
                  aria-label={`Revoke the session on ${s.device}`}
                  title="Sign this device out"
                  onClick={() => void revoke(s.sid)}
                  className="h-10 rounded-[10px] border border-bad/30 bg-surface px-4 text-[15px] font-semibold text-bad transition-colors hover:bg-bad-soft disabled:opacity-60"
                >
                  {busy === s.sid ? 'Revoking…' : 'Revoke'}
                </button>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </SectionShell>
  );
}
