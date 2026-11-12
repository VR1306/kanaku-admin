'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Skeleton } from '@/components/ui/Skeleton';
import { useApi } from '@/hooks/useApi';
import { cn } from '@/utils/cn';
import { PLAN_LABEL, type UserDetail } from '@/types/users';
import type { UserCaps } from './UsersView';
import { EditUserModal } from './EditUserModal';
import { StatusBadge } from './StatusBadge';
import {
  ChangePlanModal,
  ResetPasswordModal,
  StatusConfirm,
  type StatusAction,
} from './UserModals';

const TABS = ['Overview', 'Billing', 'Activity', 'Security'] as const;
const Row = ({ k, v }: { k: string; v: React.ReactNode }) => (
  <div className="border-b border-line py-2 last:border-0">
    <dt className="text-xs text-muted">{k}</dt>
    <dd className="font-semibold">{v}</dd>
  </div>
);

export function UserDetailView({ id, caps }: { id: string; caps: UserCaps }) {
  const { data: u, error, loading, reload } = useApi<UserDetail>(`/api/users/${id}`);
  const [tab, setTab] = useState<(typeof TABS)[number]>('Overview');
  const [reset, setReset] = useState(false);
  const [editing, setEditing] = useState(false);
  const [plan, setPlan] = useState(false);
  const [st, setSt] = useState<StatusAction>(null);

  if (loading && !u) return <Skeleton className="h-72" />;
  if (error || !u)
    return (
      <p role="alert" className="rounded-xl bg-bad-soft p-3 text-sm text-bad">
        {error ?? 'User not found'} ·{' '}
        <Link href="/users" className="underline">
          Back to users
        </Link>
      </p>
    );
  const canAct = u.status !== 'invited';

  return (
    <div className="space-y-5">
      <p className="text-sm text-muted">
        <Link href="/users" className="text-link underline">
          Users
        </Link>{' '}
        / {u.name}
      </p>
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <span
            aria-hidden
            className="grid size-14 place-items-center rounded-full bg-brand text-lg font-bold text-white"
          >
            {u.name
              .split(' ')
              .map((p) => p[0])
              .slice(0, 2)
              .join('')}
          </span>
          <div>
            <h1 className="text-3xl font-extrabold">{u.name}</h1>
            <div className="mt-1 flex items-center gap-2">
              <StatusBadge status={u.status} />
              <Badge tone="blue">{PLAN_LABEL[u.plan]}</Badge>
              <code className="text-xs text-muted">{u.id}</code>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {caps.write && (
            <Button variant="outline" onClick={() => setEditing(true)}>
              Edit user
            </Button>
          )}
          {caps.reset && canAct && (
            <Button variant="outline" onClick={() => setReset(true)}>
              Reset password
            </Button>
          )}
          {caps.plan && canAct && (
            <Button variant="outline" onClick={() => setPlan(true)}>
              Change plan
            </Button>
          )}
          {caps.suspend && u.status === 'suspended' && (
            <Button onClick={() => setSt({ user: u, to: 'active' })}>Reinstate</Button>
          )}
          {caps.suspend && (u.status === 'active' || u.status === 'inactive') && (
            <Button variant="danger" onClick={() => setSt({ user: u, to: 'suspended' })}>
              Suspend
            </Button>
          )}
        </div>
      </header>
      <div
        role="tablist"
        className="inline-flex gap-1 rounded-2xl border border-line bg-surface p-1"
      >
        {TABS.map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={cn(
              'rounded-xl px-4 py-1.5 text-sm font-semibold',
              tab === t && 'bg-brand text-white',
            )}
          >
            {t}
          </button>
        ))}
      </div>
      {tab === 'Overview' && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <Card>
            <h2 className="font-display text-lg font-bold">Account</h2>
            <dl className="mt-2">
              <Row k="Email" v={u.email} />
              <Row k="Phone" v={u.phone} />
              <Row k="Joined" v={u.joined} />
              <Row
                k="Last active"
                v={
                  u.lastActive
                    ? `${new Date(u.lastActive).toLocaleString('en-IN')} · ${u.location}`
                    : 'Never'
                }
              />
              <Row k="MFA" v={u.mfa ? 'On · authenticator app' : 'Off'} />
            </dl>
          </Card>
          <Card>
            <h2 className="font-display text-lg font-bold">Usage this month</h2>
            {u.usage ? (
              <dl className="mt-2">
                <Row k="Transactions" v={u.usage.transactions} />
                <Row k="Budgets" v={u.usage.budgets} />
                <Row k="Recurring payments" v={u.usage.recurring} />
                <Row k="Receipts stored" v={u.usage.receipts} />
              </dl>
            ) : (
              <p className="mt-2 text-sm text-muted">
                Usage figures appear here once the user app reports them.
              </p>
            )}
          </Card>
        </div>
      )}
      {tab === 'Billing' && (
        <Card>
          <h2 className="font-display text-lg font-bold">Subscription</h2>
          <dl className="mt-2 grid gap-x-6 sm:grid-cols-3">
            <Row k="Plan" v={PLAN_LABEL[u.plan]} />
            <Row k="Renews" v={u.renewsOn ?? '—'} />
            <Row k="Price" v="From billing service" />
          </dl>
          <ul className="mt-4 divide-y divide-line text-sm">
            {u.invoices.length === 0 && <li className="py-2 text-muted">No payments yet.</li>}
            {u.invoices.map((i) => (
              <li key={i.id} className="flex items-center justify-between py-2">
                <span>
                  {i.date} · <code>{i.id}</code>
                </span>
                <Badge tone={i.status === 'paid' ? 'green' : 'red'}>
                  {i.status === 'paid' ? 'Paid' : 'Failed'}
                </Badge>
              </li>
            ))}
          </ul>
        </Card>
      )}
      {tab === 'Activity' && (
        <Card>
          <ul className="divide-y divide-line">
            {u.activity.length === 0 && (
              <li className="py-3 text-sm text-muted">No admin activity recorded for this user.</li>
            )}
            {u.activity.map((a) => (
              <li key={a.title + a.at} className="flex justify-between py-3">
                <div>
                  <p className="font-bold">{a.title}</p>
                  <p className="text-xs text-muted">{a.detail}</p>
                </div>
                <span className="text-xs text-muted">{a.at}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
      {tab === 'Security' && (
        <Card>
          <dl>
            <Row k="Password" v={`Last changed ${u.lastPasswordChange ?? 'never'}`} />
            <Row k="Two-step verification" v={u.mfa ? 'On · authenticator app' : 'Off'} />
            <Row
              k="Active sessions"
              v={
                u.sessions.length
                  ? `${u.sessions.length} devices · ${u.sessions.join(', ')}`
                  : 'Not reported'
              }
            />
          </dl>
        </Card>
      )}
      <EditUserModal user={editing ? u : null} onClose={() => setEditing(false)} onDone={reload} />
      <ResetPasswordModal user={reset ? u : null} onClose={() => setReset(false)} onDone={reload} />
      <ChangePlanModal user={plan ? u : null} onClose={() => setPlan(false)} onDone={reload} />
      <StatusConfirm action={st} onClose={() => setSt(null)} onDone={reload} />
    </div>
  );
}
