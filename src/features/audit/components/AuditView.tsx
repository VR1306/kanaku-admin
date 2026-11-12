'use client';

import { useState } from 'react';
import { Icon } from '@/components/icons/icon';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { DataTable, Identity, type Column } from '@/components/ui/DataTable';
import { Input, Select, TextField } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { useApi } from '@/hooks/useApi';
import { api } from '@/lib/api-client';
import { cn } from '@/utils/cn';
import { formatIST } from '@/utils/format';
import type { AuditEntry } from '@/types/audit';

interface Resp {
  items: AuditEntry[];
  actors: string[];
  roles: string[];
}
interface Alert {
  id: string;
  kind: string;
  message: string;
  at: string;
}
const RESULTS = [
  { value: 'all', label: 'All' },
  { value: 'success', label: 'Success' },
  { value: 'failed', label: 'Failed' },
] as const;
const blank = {
  q: '',
  result: 'all',
  actor: '',
  role: '',
  action: '',
  resource: '',
  ip: '',
  from: '',
  to: '',
};
type Filters = typeof blank;
const LABEL: Record<string, string> = {
  actor: 'Actor',
  role: 'Role',
  action: 'Action',
  resource: 'Resource',
  ip: 'IP',
  from: 'From',
  to: 'To',
};

/** Quick date presets in IST (YYYY-MM-DD). Computed on click, never during render. */
const istDay = (offsetDays: number) =>
  new Date(Date.now() + 5.5 * 3600_000 - offsetDays * 86_400_000).toISOString().slice(0, 10);

export function AuditView({ isSuper }: { isSuper: boolean }) {
  const { toast } = useToast();
  const [f, setF] = useState<Filters>(blank);
  const [panel, setPanel] = useState(false);
  const [entry, setEntry] = useState<AuditEntry | null>(null);
  const qs = new URLSearchParams(Object.entries(f).filter(([, v]) => v && v !== 'all')).toString();
  const { data, error, loading, refreshing, reload } = useApi<Resp>(`/api/audit?${qs}`);
  const alerts = useApi<Alert[]>(isSuper ? '/api/audit/alerts' : null);
  const set = (p: Partial<Filters>) => setF((cur) => ({ ...cur, ...p }));
  const chips = (Object.keys(LABEL) as Array<keyof typeof LABEL>).filter(
    (k) => f[k as keyof Filters],
  );

  async function exportCsv() {
    const { csv } = await api<{ csv: string }>('/api/audit/export');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = 'audit-log.csv';
    a.click();
    toast('Exported — this export is recorded in the log');
    reload();
  }

  const columns: Column<AuditEntry>[] = [
    {
      key: 'time',
      header: 'Time (IST)',
      render: (e) => <span className="whitespace-nowrap text-muted">{formatIST(e.at)}</span>,
    },
    {
      key: 'actor',
      header: 'Actor',
      render: (e) => <Identity name={e.actor.split('@')[0]} sub={e.actorRole.replace(/_/g, ' ')} />,
    },
    {
      key: 'action',
      header: 'Action',
      render: (e) => <span className="font-semibold">{e.action}</span>,
    },
    {
      key: 'res',
      header: 'Affected resource',
      className: 'hidden lg:table-cell',
      render: (e) => <span className="text-muted">{e.resource}</span>,
    },
    {
      key: 'ip',
      header: 'IP address',
      className: 'hidden xl:table-cell',
      render: (e) => <code className="text-[13px] text-ink-2">{e.ip}</code>,
    },
    {
      key: 'r',
      header: 'Result',
      render: (e) => (
        <Badge tone={e.result === 'success' ? 'green' : 'red'}>
          {e.result === 'success' ? 'Success' : 'Failed'}
        </Badge>
      ),
    },
    {
      key: 'a',
      header: 'Actions',
      align: 'right',
      render: (e) => (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setEntry(e)}
            className="h-10 rounded-[10px] border border-line-strong bg-surface px-4 text-sm font-semibold text-link hover:bg-canvas"
          >
            Details
          </button>
        </div>
      ),
    },
  ];
  const field = (k: string, v: string | undefined) => (
    <div className="border-b border-line-soft py-3 last:border-0">
      <dt className="text-xs text-muted">{k}</dt>
      <dd className="mt-0.5 font-semibold break-words">{v || '—'}</dd>
    </div>
  );

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold sm:text-4xl">Audit log</h1>
          <p className="mt-1 text-sm text-muted">
            Every admin action, sign-in and state change · read-only · times in IST
          </p>
        </div>
        <Button variant="outline" onClick={exportCsv}>
          <Icon name="download" size={18} />
          Export CSV
        </Button>
      </header>
      {alerts.data && alerts.data.length > 0 && (
        <Card className="border-warn/40 bg-warn-soft p-5">
          <h2 className="flex items-center gap-2 font-display font-bold text-warn">
            <Icon name="warning" size={18} />
            Security alerts
          </h2>
          <ul className="mt-2 space-y-1 text-sm text-warn">
            {alerts.data.slice(0, 5).map((a) => (
              <li key={a.id}>
                {formatIST(a.at)} — {a.message}
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card className="overflow-hidden p-0">
        <div className="space-y-4 border-b border-line-soft p-5 md:px-7">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[240px] flex-1 lg:max-w-md">
              <Icon
                name="search"
                size={18}
                className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-subtle"
              />
              <Input
                aria-label="Search audit log"
                placeholder="Search actor, action, resource or IP"
                value={f.q}
                onChange={(e) => set({ q: e.target.value })}
                className="h-12 pl-11"
              />
            </div>
            <SegmentedControl
              aria-label="Result"
              options={RESULTS}
              value={f.result as 'all'}
              onChange={(v) => set({ result: v })}
            />
            <div className="flex gap-2">
              {[
                ['Today', 0],
                ['7 days', 7],
                ['30 days', 30],
              ].map(([label, d]) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => set({ from: istDay(Number(d)), to: istDay(0) })}
                  className="h-10 rounded-full border border-line-strong bg-surface px-4 text-sm font-semibold text-ink-2 hover:bg-canvas"
                >
                  {label}
                </button>
              ))}
            </div>
            <button
              type="button"
              aria-expanded={panel}
              onClick={() => setPanel((v) => !v)}
              className={cn(
                'inline-flex h-12 items-center gap-2 rounded-control border px-4 text-sm font-semibold transition-colors',
                panel
                  ? 'border-brand bg-brand-soft text-link'
                  : 'border-line-strong bg-surface text-ink-2 hover:bg-canvas',
              )}
            >
              <Icon name="filter" size={16} />
              Filters
              {chips.length > 0 && (
                <span className="grid size-5 place-items-center rounded-full bg-brand text-[11px] text-white">
                  {chips.length}
                </span>
              )}
            </button>
          </div>
          {panel && (
            <div className="grid gap-4 rounded-2xl bg-canvas p-5 sm:grid-cols-2 lg:grid-cols-4">
              <div className="flex flex-col gap-2">
                <label htmlFor="af-actor" className="text-sm font-semibold">
                  Actor
                </label>
                <Select
                  id="af-actor"
                  value={f.actor}
                  onChange={(e) => set({ actor: e.target.value })}
                  options={[
                    { value: '', label: 'All admins' },
                    ...(data?.actors ?? []).map((a) => ({ value: a, label: a })),
                  ]}
                />
              </div>
              <div className="flex flex-col gap-2">
                <label htmlFor="af-role" className="text-sm font-semibold">
                  Role
                </label>
                <Select
                  id="af-role"
                  value={f.role}
                  onChange={(e) => set({ role: e.target.value })}
                  options={[
                    { value: '', label: 'All roles' },
                    ...(data?.roles ?? []).map((a) => ({ value: a, label: a.replace(/_/g, ' ') })),
                  ]}
                />
              </div>
              <TextField
                label="Action contains"
                placeholder="e.g. Refunded"
                value={f.action}
                onChange={(e) => set({ action: e.target.value })}
              />
              <TextField
                label="Resource contains"
                placeholder="e.g. Coupon"
                value={f.resource}
                onChange={(e) => set({ resource: e.target.value })}
              />
              <TextField
                label="IP address"
                placeholder="e.g. 49.204"
                value={f.ip}
                onChange={(e) => set({ ip: e.target.value })}
              />
              <TextField
                label="From date"
                type="date"
                placeholder="dd/mm/yyyy"
                value={f.from}
                onChange={(e) => set({ from: e.target.value })}
              />
              <TextField
                label="To date"
                type="date"
                placeholder="dd/mm/yyyy"
                value={f.to}
                onChange={(e) => set({ to: e.target.value })}
              />
            </div>
          )}
          {chips.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              {chips.map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => set({ [k]: '' } as Partial<Filters>)}
                  className="inline-flex h-8 items-center gap-1.5 rounded-full bg-brand-soft px-3 text-[13px] font-semibold text-link"
                >
                  {LABEL[k]}: {f[k as keyof Filters]}
                  <Icon name="close" size={12} strokeWidth={2.4} />
                </button>
              ))}
              <button
                type="button"
                onClick={() => setF(blank)}
                className="text-sm font-semibold text-link hover:underline"
              >
                Clear all
              </button>
            </div>
          )}
        </div>
        {loading && !data ? (
          <div className="p-7">
            <Skeleton className="h-64" />
          </div>
        ) : (
          <DataTable
            caption="Audit entries"
            loading={loading}
            refreshing={refreshing}
            error={error}
            onRetry={reload}
            columns={columns}
            rows={data?.items ?? []}
            rowKey={(e) => e.id}
            emptyTitle="No audit entries match"
            emptyHint="Adjust or clear the filters."
          />
        )}
      </Card>

      <Modal
        open={!!entry}
        variant="drawer"
        title="Audit entry"
        subtitle="Audit entries can’t be edited or deleted."
        onClose={() => setEntry(null)}
        footer={
          <>
            <Button
              variant="outline"
              onClick={() =>
                entry &&
                navigator.clipboard
                  ?.writeText(entry.requestId)
                  .then(() => toast('Request ID copied'))
              }
            >
              Copy request ID
            </Button>
            <Button onClick={() => setEntry(null)}>Close</Button>
          </>
        }
      >
        {entry && (
          <dl>
            {field('Action', entry.action)}
            {field('Actor', `${entry.actor} (${entry.actorRole.replace(/_/g, ' ')})`)}
            {field('Affected resource', entry.resource)}
            {field('Result', entry.result === 'success' ? 'Success' : 'Failed')}
            {field('Time (IST)', formatIST(entry.at))}
            {field('Time (UTC)', entry.at)}
            {field('IP address', entry.ip)}
            {field('Device', entry.device)}
            {entry.before !== undefined && field('Before', JSON.stringify(entry.before))}
            {entry.after !== undefined && field('After', JSON.stringify(entry.after))}
            <div className="border-b border-line-soft py-3">
              <dt className="text-xs text-muted">Request ID</dt>
              <dd className="mt-0.5 font-mono text-sm">{entry.requestId}</dd>
            </div>
          </dl>
        )}
        <p className="rounded-2xl bg-canvas p-4 text-xs text-muted">
          Retention (assumed, unconfirmed): 2 years online, then archived.
        </p>
      </Modal>
    </div>
  );
}
