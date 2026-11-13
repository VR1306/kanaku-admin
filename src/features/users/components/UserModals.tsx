'use client';

import { useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Checkbox, SelectField, TextField } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { api } from '@/lib/api-client';
import { type AppUser } from '@/types/users';
import { addUserBody } from '../schemas/users';
import { PLAN_OPTIONS, msg } from './modal-shared';

export function AddUserModal({
  open,
  onClose,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  onDone: () => void;
}) {
  const { toast } = useToast();
  const [f, setF] = useState({
    name: '',
    email: '',
    phone: '+91 ',
    plan: 'starter',
    trial: '0',
    send: true,
  });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const body = {
    name: f.name,
    email: f.email,
    phone: f.phone.trim() === '+91' ? '' : f.phone,
    plan: f.plan,
    trialDays: Number(f.trial),
    sendInvite: f.send,
  };
  const parsed = addUserBody.safeParse(body);
  const fieldErr = (k: string) =>
    (f.name || f.email) && !parsed.success
      ? parsed.error.issues.find((i) => i.path[0] === k)?.message
      : undefined;

  async function submit() {
    setBusy(true);
    try {
      const r = await api<{ inviteLink: string; emailed: boolean }>('/api/users', { body });
      onClose();
      onDone();
      setErr('');
      setF({ name: '', email: '', phone: '+91 ', plan: 'starter', trial: '0', send: true });
      toast(
        !f.send
          ? 'User added as Invited — signup link copied'
          : r.emailed
            ? 'User added — invitation emailed'
            : 'User added, but the email could not be sent — signup link copied',
      );
      navigator.clipboard?.writeText(r.inviteLink).catch(() => {});
    } catch (e) {
      setErr(msg(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      open={open}
      variant="drawer"
      busy={busy}
      title="Add user"
      subtitle="Adds the person and emails them an invitation to sign up."
      onClose={onClose}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button disabled={!parsed.success} loading={busy} onClick={submit}>
            Add user and send invite
          </Button>
        </>
      }
    >
      <p className="rounded-2xl bg-canvas p-4 text-sm text-muted">
        The user starts as <Badge tone="amber">Invited</Badge> and becomes{' '}
        <Badge tone="green">Active</Badge> after setting a password and MFA.
      </p>
      <TextField
        label="Full name"
        placeholder="e.g. Priya Sharma"
        autoComplete="off"
        value={f.name}
        onChange={(e) => setF({ ...f, name: e.target.value })}
        error={fieldErr('name')}
      />
      <TextField
        label="Email"
        type="email"
        placeholder="name@example.com"
        autoComplete="off"
        value={f.email}
        onChange={(e) => setF({ ...f, email: e.target.value })}
        error={fieldErr('email')}
      />
      <TextField
        label="Phone (optional)"
        type="tel"
        placeholder="+91 98765 43210"
        value={f.phone}
        onChange={(e) => setF({ ...f, phone: e.target.value })}
      />
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <SelectField
          label="Plan"
          value={f.plan}
          onChange={(e) => setF({ ...f, plan: e.target.value })}
          options={PLAN_OPTIONS}
        />
        <SelectField
          label="Trial period"
          value={f.trial}
          onChange={(e) => setF({ ...f, trial: e.target.value })}
          options={[
            { value: '0', label: 'None' },
            { value: '14', label: '14 days' },
            { value: '30', label: '30 days' },
            { value: '90', label: '90 days' },
          ]}
        />
      </div>
      <Checkbox
        checked={f.send}
        onChange={(e) => setF({ ...f, send: e.target.checked })}
        label="Email the invitation to sign up now"
      />
      {err && (
        <p role="alert" className="rounded-xl bg-bad-soft px-4 py-3 text-sm text-bad">
          {err}
        </p>
      )}
    </Modal>
  );
}

export function ResetPasswordModal({
  user,
  onClose,
  onDone,
}: {
  user: AppUser | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const { toast } = useToast();
  const [signOut, setSignOut] = useState(true);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit() {
    setBusy(true);
    try {
      const r = await api<{ emailed: boolean; signedOut: boolean }>(
        `/api/users/${user!.id}/reset-password`,
        { body: { method: 'link', signOutAll: signOut } },
      );
      toast(
        r.emailed
          ? `Reset email sent to ${user!.email}${signOut && r.signedOut ? ' · signed out of all devices' : ''}`
          : 'The reset email could not be sent. Please try again shortly.',
      );
      if (r.emailed) {
        onClose();
        onDone();
      }
      setErr('');
    } catch (e) {
      setErr(msg(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal
      open={!!user}
      busy={busy}
      title="Reset password"
      subtitle={user ? `${user.name} · ${user.email}` : undefined}
      onClose={onClose}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button loading={busy} onClick={submit}>
            Send reset email
          </Button>
        </>
      }
    >
      <p className="rounded-2xl bg-canvas p-4 text-sm text-muted">
        Last changed <b className="text-ink">{user?.lastPasswordChange ?? 'never'}</b> · MFA{' '}
        {user?.mfa ? 'on' : 'off'}
      </p>
      <p className="text-sm text-muted">
        We email <b className="text-ink">{user?.email}</b> a link to the app&apos;s password-reset
        page. They enter their address, get a 6-digit code by email, and choose a new password
        themselves. Nobody else ever sees it.
      </p>
      <Checkbox
        checked={signOut}
        onChange={(e) => setSignOut(e.target.checked)}
        label="Sign the user out of all devices"
      />
      {err && (
        <p role="alert" className="rounded-xl bg-bad-soft px-4 py-3 text-sm text-bad">
          {err}
        </p>
      )}
    </Modal>
  );
}

export * from './PlanAndStatusModals';
