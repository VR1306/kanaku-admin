'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { Icon } from '@/components/icons/icon';
import { ActionMenu, type MenuAction } from '@/components/ui/ActionMenu';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { DataTable, Identity, type Column } from '@/components/ui/DataTable';
import { Input, Select, TextField } from '@/components/ui/Field';
import { Pagination } from '@/components/ui/Pagination';
import { PillTabs } from '@/components/ui/PillTabs';
import { useToast } from '@/components/ui/Toast';
import { useApi } from '@/hooks/useApi';
import { api, ApiError } from '@/lib/api-client';
import { formatDate } from '@/utils/format';
import { PLAN_LABEL, type AppUser, type UserPage, type UserStatus } from '@/types/users';
import { EditUserModal } from './EditUserModal';
import { StatusBadge } from './StatusBadge';
import {
  AddUserModal,
  ChangePlanModal,
  ResetPasswordModal,
  StatusConfirm,
  type StatusAction,
} from './UserModals';

const TABS: Array<{ id: UserStatus | 'all'; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'invited', label: 'Invited' },
  { id: 'active', label: 'Active' },
  { id: 'inactive', label: 'Inactive' },
  { id: 'suspended', label: 'Suspended' },
];
const PAGE_SIZE = 8;
export interface UserCaps {
  write: boolean;
  suspend: boolean;
  reset: boolean;
  plan: boolean;
  export: boolean;
  announce: boolean;
}

/** `caps` only drive UI visibility; the BFF enforces each permission regardless. */
export function UsersView({ caps }: { caps: UserCaps }) {
  const { toast } = useToast();
  const router = useRouter();
  const params = useSearchParams();
  const [status, setStatus] = useState<UserStatus | 'all'>('all');
  const [q, setQ] = useState(params.get('q') ?? '');
  const [plan, setPlan] = useState('all');
  const [joinedFrom, setJoinedFrom] = useState('');
  const [joinedTo, setJoinedTo] = useState('');
  const [filters, setFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [sel, setSel] = useState<string[]>([]);
  const [addLocal, setAdd] = useState(false);
  const [reset, setReset] = useState<AppUser | null>(null);
  const [editing, setEditing] = useState<AppUser | null>(null);
  const [chg, setChg] = useState<AppUser | null>(null);
  const [st, setSt] = useState<StatusAction>(null);
  // The sidebar's "Add user" button links to /users?add=1; deriving from the URL works even when already on /users.
  const addFromUrl = params.get('add') === '1' && caps.write;
  const add = addLocal || addFromUrl;

  const qs = new URLSearchParams({
    status,
    q,
    plan,
    page: String(page),
    pageSize: String(PAGE_SIZE),
    ...(joinedFrom && { joinedFrom }),
    ...(joinedTo && { joinedTo }),
  });
  const { data, error, loading, refreshing, reload } = useApi<UserPage>(`/api/users?${qs}`);
  const f =
    <T,>(fn: (v: T) => void) =>
    (v: T) => {
      fn(v);
      setPage(1);
      setSel([]);
    };
  const activeFilters = (plan !== 'all' ? 1 : 0) + (joinedFrom ? 1 : 0) + (joinedTo ? 1 : 0);

  async function exportCsv() {
    try {
      const r = await api<{ csv: string; count: number }>(
        `/api/users/export${sel.length ? `?ids=${sel.join(',')}` : ''}`,
      );
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([r.csv], { type: 'text/csv' }));
      a.download = 'users.csv';
      a.click();
      toast(`Exported ${r.count} users`);
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Export failed');
    }
  }
  async function resend(u: AppUser) {
    try {
      const r = await api<{ inviteLink: string; emailed: boolean }>(
        `/api/users/${u.id}/resend-invite`,
        { body: {} },
      );
      navigator.clipboard?.writeText(r.inviteLink).catch(() => {});
      toast(
        r.emailed
          ? 'Invitation emailed again'
          : 'Email could not be sent — signup link copied, send it yourself',
      );
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Failed');
    }
  }

  const actionsFor = (u: AppUser): MenuAction[] => [
    { label: 'View details', icon: 'profile', href: `/users/${u.id}` },
    ...(caps.write
      ? [{ label: 'Edit user', icon: 'edit' as const, onSelect: () => setEditing(u) }]
      : []),
    ...(caps.reset && u.status !== 'invited'
      ? [{ label: 'Reset password', icon: 'lock' as const, onSelect: () => setReset(u) }]
      : []),
    ...(caps.plan && u.status !== 'invited'
      ? [{ label: 'Change plan', icon: 'payments' as const, onSelect: () => setChg(u) }]
      : []),
    ...(caps.write && u.status === 'invited'
      ? [{ label: 'Resend invitation', icon: 'announcements' as const, onSelect: () => resend(u) }]
      : []),
    ...(caps.write && u.status === 'active'
      ? [
          {
            label: 'Disable account',
            icon: 'close' as const,
            onSelect: () => setSt({ user: u, to: 'inactive' }),
          },
        ]
      : []),
    ...(caps.write && u.status === 'inactive'
      ? [
          {
            label: 'Re-enable account',
            icon: 'check' as const,
            onSelect: () => setSt({ user: u, to: 'active' }),
          },
        ]
      : []),
    ...(caps.suspend && (u.status === 'active' || u.status === 'inactive')
      ? [
          {
            label: 'Suspend user',
            icon: 'warning' as const,
            danger: true,
            onSelect: () => setSt({ user: u, to: 'suspended' }),
          },
        ]
      : []),
    ...(caps.suspend && u.status === 'suspended'
      ? [
          {
            label: 'Reinstate user',
            icon: 'check' as const,
            onSelect: () => setSt({ user: u, to: 'active' }),
          },
        ]
      : []),
  ];

  const columns: Column<AppUser>[] = [
    {
      key: 'user',
      header: 'User',
      render: (u) => (
        <Link href={`/users/${u.id}`} className="block hover:opacity-80">
          <Identity name={u.name} sub={u.email} />
        </Link>
      ),
    },
    {
      key: 'plan',
      header: 'Plan',
      render: (u) => <span className="text-muted">{PLAN_LABEL[u.plan]}</span>,
    },
    { key: 'status', header: 'Status', render: (u) => <StatusBadge status={u.status} /> },
    {
      key: 'last',
      header: 'Last active',
      className: 'hidden md:table-cell',
      render: (u) => (
        <span className="text-muted">
          {u.lastActive ? new Date(u.lastActive).toLocaleDateString('en-IN') : 'Never'}
        </span>
      ),
    },
    {
      key: 'joined',
      header: 'Joined',
      className: 'hidden lg:table-cell',
      render: (u) => <span className="text-muted">{formatDate(u.joined)}</span>,
    },
    {
      key: 'act',
      header: 'Actions',
      align: 'right',
      render: (u) => (
        <div className="flex justify-end">
          <ActionMenu label={`Actions for ${u.name}`} actions={actionsFor(u)} />
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold sm:text-4xl">Users</h1>
          <p className="mt-1 text-sm text-muted">
            {data ? `${data.counts.all.toLocaleString('en-IN')} accounts` : 'Loading…'}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          {caps.export && (
            <Button variant="outline" onClick={exportCsv}>
              {sel.length ? `Export ${sel.length} selected` : 'Export CSV'}
            </Button>
          )}
          {caps.announce && sel.length > 0 && (
            <Link
              href={`/announcements?users=${sel.join(',')}`}
              className="inline-flex h-[52px] items-center rounded-control border border-line-strong bg-surface px-6 text-[15px] font-bold text-link hover:bg-canvas"
            >
              Send announcement ({sel.length})
            </Link>
          )}
          {caps.write && (
            <Button onClick={() => setAdd(true)}>
              <Icon name="plus" size={18} strokeWidth={2.4} />
              Add user
            </Button>
          )}
        </div>
      </header>

      <Card className="overflow-hidden p-0">
        <div className="space-y-4 border-b border-line-soft p-5 md:px-7">
          <PillTabs
            aria-label="User status"
            tabs={TABS.map((t) => ({ value: t.id, label: t.label, count: data?.counts[t.id] }))}
            value={status}
            onChange={(v) => f(setStatus)(v)}
          />
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[240px] flex-1 sm:max-w-sm">
              <Icon
                name="search"
                size={18}
                className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-subtle"
              />
              <Input
                aria-label="Search users"
                placeholder="Search by name, email or user ID"
                value={q}
                onChange={(e) => f(setQ)(e.target.value)}
                className="h-12 pl-11"
              />
            </div>
            <Select
              aria-label="Plan"
              compact
              className="w-44"
              value={plan}
              onChange={(e) => f(setPlan)(e.target.value)}
              options={[
                { value: 'all', label: 'All plans' },
                ...Object.entries(PLAN_LABEL).map(([value, label]) => ({ value, label })),
              ]}
            />
            <button
              type="button"
              aria-expanded={filters}
              onClick={() => setFilters((v) => !v)}
              className="inline-flex h-12 items-center gap-2 rounded-control border border-line-strong bg-surface px-4 text-sm font-semibold text-ink-2 hover:bg-canvas"
            >
              More filters
              {activeFilters > 0 && (
                <span className="grid size-5 place-items-center rounded-full bg-brand text-[11px] text-white">
                  {activeFilters}
                </span>
              )}
            </button>
            {(activeFilters > 0 || q) && (
              <button
                type="button"
                className="text-sm font-semibold text-link hover:underline"
                onClick={() => {
                  setQ('');
                  setPlan('all');
                  setJoinedFrom('');
                  setJoinedTo('');
                  setPage(1);
                }}
              >
                Clear
              </button>
            )}
          </div>
          {filters && (
            <div className="grid max-w-lg gap-4 sm:grid-cols-2">
              <TextField
                label="Joined from"
                type="date"
                placeholder="dd/mm/yyyy"
                value={joinedFrom}
                onChange={(e) => f(setJoinedFrom)(e.target.value)}
              />
              <TextField
                label="Joined to"
                type="date"
                placeholder="dd/mm/yyyy"
                value={joinedTo}
                onChange={(e) => f(setJoinedTo)(e.target.value)}
              />
            </div>
          )}
        </div>
        <>
          <DataTable
            caption="Users"
            columns={columns}
            rows={data?.items ?? []}
            rowKey={(u) => u.id}
            selection={{ selected: sel, onChange: setSel, label: (u) => u.name }}
            loading={loading}
            refreshing={refreshing}
            error={error}
            onRetry={reload}
            emptyTitle="No users match"
            emptyHint="Try a different filter or search term."
          />
          <Pagination
            page={page}
            pageSize={PAGE_SIZE}
            total={data?.total ?? 0}
            onPage={(p) => {
              setPage(p);
              setSel([]);
            }}
          />
        </>
      </Card>
      <p className="text-xs text-muted">
        <b>Invited</b> set-up pending · <b>Active</b> password + MFA set · <b>Inactive</b> disabled
        or dormant · <b>Suspended</b> access revoked. Only Active users can sign in.
      </p>
      <AddUserModal
        open={add}
        onClose={() => {
          setAdd(false);
          if (addFromUrl) router.replace('/users');
        }}
        onDone={reload}
      />
      <EditUserModal user={editing} onClose={() => setEditing(null)} onDone={reload} />
      <ResetPasswordModal user={reset} onClose={() => setReset(null)} onDone={reload} />
      <ChangePlanModal user={chg} onClose={() => setChg(null)} onDone={reload} />
      <StatusConfirm action={st} onClose={() => setSt(null)} onDone={reload} />
    </div>
  );
}
