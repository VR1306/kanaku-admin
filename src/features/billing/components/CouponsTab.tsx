'use client';

import { useState } from 'react';
import { Icon } from '@/components/icons/icon';
import { ActionMenu, type MenuAction } from '@/components/ui/ActionMenu';
import { Badge, type Tone } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { Checkbox, SelectField, TextField } from '@/components/ui/Field';
import { ConfirmDialog, Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { useApi } from '@/hooks/useApi';
import { api, ApiError } from '@/lib/api-client';
import type { Coupon } from '@/types/admin';
import { couponCreate } from '../schemas/billing';

type Row = Coupon & { state: 'active' | 'inactive' | 'archived' | 'expired' | 'scheduled' };
const PLANS = ['Pro monthly', 'Pro yearly'];
const DURATIONS = [
  { value: 'once', label: 'Once (first payment)' },
  { value: 'first3', label: 'First 3 months' },
  { value: 'first12', label: 'First 12 months' },
  { value: 'forever', label: 'Forever' },
];
const STATE_TONE: Record<Row['state'], Tone> = {
  active: 'green',
  inactive: 'gray',
  archived: 'gray',
  expired: 'amber',
  scheduled: 'blue',
};
const genCode = () => `KANAKU${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
const blank = () => ({
  code: genCode(),
  type: 'percent',
  value: '20',
  plans: ['Pro yearly'],
  duration: 'once',
  from: '',
  until: '',
  max: '1000',
  perUser: '1',
  active: true,
  listed: true,
});
type Form = ReturnType<typeof blank>;

export function CouponsTab({ canEdit }: { canEdit: boolean }) {
  const { toast } = useToast();
  const { data, error, loading, refreshing, reload } = useApi<Row[]>('/api/coupons');
  const [drawer, setDrawer] = useState<{
    mode: 'create' | 'edit';
    id?: string;
    redeemed?: number;
  } | null>(null);
  const [f, setF] = useState<Form>(blank());
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [del, setDel] = useState<Coupon | null>(null);
  const [act, setAct] = useState<{ kind: 'archive' | 'deactivate'; c: Row } | null>(null);

  const payload = {
    code: f.code.toUpperCase(),
    type: f.type,
    value: Number(f.value),
    plans: f.plans,
    duration: f.duration,
    from: f.from,
    until: f.until,
    maxRedemptions: f.max ? Number(f.max) : null,
    perUser: Number(f.perUser),
    active: f.active,
    listed: f.listed,
  };
  const parsed = couponCreate.safeParse(payload);
  const issue = !parsed.success && (f.from || f.until) ? parsed.error.issues[0].message : '';

  const run = async (fn: () => Promise<unknown>, ok: string, done?: () => void) => {
    setBusy(true);
    try {
      await fn();
      toast(ok);
      done?.();
      setErr('');
      reload();
    } catch (e) {
      const m = e instanceof ApiError ? e.message : 'Action failed';
      setErr(m);
      toast(m);
    } finally {
      setBusy(false);
    }
  };
  const openCreate = (from?: Coupon) => {
    setErr('');
    setF(
      from
        ? {
            ...blank(),
            type: from.type,
            value: String(from.value),
            plans: from.plans,
            duration: from.duration,
            max: from.maxRedemptions ? String(from.maxRedemptions) : '',
            perUser: String(from.perUser),
            listed: from.listed ?? true,
          }
        : blank(),
    );
    setDrawer({ mode: 'create' });
  };
  const openEdit = (c: Coupon) => {
    setErr('');
    setF({
      code: c.code,
      type: c.type,
      value: String(c.value),
      plans: c.plans,
      duration: c.duration,
      from: c.from,
      until: c.until,
      max: c.maxRedemptions ? String(c.maxRedemptions) : '',
      perUser: String(c.perUser),
      active: c.active,
      listed: c.listed ?? true,
    });
    setDrawer({ mode: 'edit', id: c.id, redeemed: c.redeemed });
  };

  const menu = (c: Row): MenuAction[] => [
    { label: 'Edit', icon: 'edit', onSelect: () => openEdit(c) },
    { label: 'Duplicate', icon: 'plus', onSelect: () => openCreate(c) },
    c.state === 'inactive' || c.state === 'archived'
      ? {
          label: 'Activate',
          icon: 'check',
          onSelect: () =>
            run(
              () => api(`/api/coupons/${c.id}`, { method: 'PATCH', body: { active: true } }),
              'Activated',
            ),
        }
      : {
          label: 'Deactivate',
          icon: 'close',
          onSelect: () => setAct({ kind: 'deactivate', c }),
        },
    ...(c.state !== 'archived'
      ? [
          {
            label: 'Archive',
            icon: 'logout' as const,
            onSelect: () => setAct({ kind: 'archive', c }),
          },
        ]
      : []),
    ...(c.redeemed === 0
      ? [{ label: 'Delete', icon: 'trash' as const, danger: true, onSelect: () => setDel(c) }]
      : []),
  ];
  const columns: Column<Row>[] = [
    {
      key: 'c',
      header: 'Code',
      render: (c) => (
        <code className="rounded-lg bg-canvas px-2.5 py-1 text-[13px] font-bold">{c.code}</code>
      ),
    },
    {
      key: 'd',
      header: 'Discount',
      render: (c) => (
        <span className="font-semibold">
          {c.type === 'percent' ? `${c.value}% off` : `₹${c.value} off`}
        </span>
      ),
    },
    {
      key: 'p',
      header: 'Plans',
      className: 'hidden md:table-cell',
      render: (c) => <span className="text-muted">{c.plans.join(', ')}</span>,
    },
    {
      key: 'r',
      header: 'Redemptions',
      render: (c) => (
        <span className="text-muted">
          {c.redeemed} / {c.maxRedemptions ?? '∞'}
        </span>
      ),
    },
    {
      key: 'v',
      header: 'Validity',
      className: 'hidden lg:table-cell',
      render: (c) => (
        <span className="whitespace-nowrap text-muted">
          {c.from} – {c.until}
        </span>
      ),
    },
    {
      key: 's',
      header: 'Status',
      render: (c) => (
        <Badge tone={STATE_TONE[c.state]}>{c.state[0].toUpperCase() + c.state.slice(1)}</Badge>
      ),
    },
    ...(canEdit
      ? [
          {
            key: 'a',
            header: 'Actions',
            align: 'right' as const,
            render: (c: Row) => (
              <div className="flex justify-end">
                <ActionMenu label={`Actions for ${c.code}`} actions={menu(c)} />
              </div>
            ),
          },
        ]
      : []),
  ];
  const save = () =>
    run(
      () =>
        drawer?.mode === 'edit'
          ? api(`/api/coupons/${drawer.id}`, { method: 'PUT', body: payload })
          : api('/api/coupons', { body: payload }),
      drawer?.mode === 'edit' ? 'Coupon updated' : 'Coupon created',
      () => setDrawer(null),
    );
  const label = DURATIONS.find((d) => d.value === f.duration)
    ?.label.split(' (')[0]
    .toLowerCase();

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">Discount codes applied at checkout.</p>
        {canEdit && (
          <Button onClick={() => openCreate()}>
            <Icon name="plus" size={18} strokeWidth={2.4} />
            Create coupon
          </Button>
        )}
      </div>
      <Card className="overflow-hidden p-0">
        <DataTable
          caption="Coupons"
          loading={loading}
          refreshing={refreshing}
          error={error}
          onRetry={reload}
          columns={columns}
          rows={data ?? []}
          rowKey={(c) => c.id}
          emptyTitle="No coupons yet"
          emptyHint="Create a code to offer a discount at checkout."
        />
      </Card>

      <Modal
        open={!!drawer}
        variant="drawer"
        width="lg"
        busy={busy}
        title={drawer?.mode === 'edit' ? 'Edit coupon' : 'Create coupon'}
        subtitle="Codes are 4–20 uppercase letters or numbers."
        onClose={() => setDrawer(null)}
        footer={
          <>
            <Button variant="outline" onClick={() => setDrawer(null)} disabled={busy}>
              Cancel
            </Button>
            <Button disabled={!parsed.success} loading={busy} onClick={save}>
              {drawer?.mode === 'edit' ? 'Save changes' : 'Create coupon'}
            </Button>
          </>
        }
      >
        <div className="flex items-end gap-3">
          <div className="flex-1">
            <TextField
              label="Coupon code"
              placeholder="e.g. DIWALI26"
              value={f.code}
              disabled={!!drawer?.redeemed}
              onChange={(e) =>
                setF({ ...f, code: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '') })
              }
              hint={drawer?.redeemed ? 'Can’t change after it has been redeemed' : undefined}
            />
          </div>
          {drawer?.mode === 'create' && (
            <Button variant="outline" onClick={() => setF({ ...f, code: genCode() })}>
              Generate
            </Button>
          )}
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <SelectField
            label="Discount type"
            value={f.type}
            onChange={(e) => setF({ ...f, type: e.target.value })}
            options={[
              { value: 'percent', label: 'Percentage (%)' },
              { value: 'fixed', label: 'Fixed amount (₹)' },
            ]}
          />
          <TextField
            label={f.type === 'percent' ? 'Discount value (%)' : 'Discount value (₹)'}
            type="number"
            min="1"
            placeholder={f.type === 'percent' ? 'e.g. 20' : 'e.g. 100'}
            value={f.value}
            onChange={(e) => setF({ ...f, value: e.target.value })}
          />
        </div>
        <fieldset className="space-y-2">
          <legend className="text-sm font-semibold">Applies to</legend>
          <div className="flex flex-wrap gap-5 pt-1">
            {PLANS.map((p) => (
              <Checkbox
                key={p}
                label={p}
                checked={f.plans.includes(p)}
                onChange={(e) =>
                  setF({
                    ...f,
                    plans: e.target.checked ? [...f.plans, p] : f.plans.filter((x) => x !== p),
                  })
                }
              />
            ))}
          </div>
        </fieldset>
        <SelectField
          label="Duration"
          value={f.duration}
          onChange={(e) => setF({ ...f, duration: e.target.value })}
          options={DURATIONS}
        />
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <TextField
            label="Valid from"
            type="date"
            placeholder="dd/mm/yyyy"
            value={f.from}
            onChange={(e) => setF({ ...f, from: e.target.value })}
          />
          <TextField
            label="Valid until"
            type="date"
            placeholder="dd/mm/yyyy"
            value={f.until}
            onChange={(e) => setF({ ...f, until: e.target.value })}
          />
        </div>
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          <TextField
            label="Total redemptions"
            type="number"
            min="1"
            placeholder="Leave blank for unlimited"
            value={f.max}
            onChange={(e) => setF({ ...f, max: e.target.value })}
          />
          <TextField
            label="Per user"
            type="number"
            min="1"
            placeholder="e.g. 1"
            value={f.perUser}
            onChange={(e) => setF({ ...f, perUser: e.target.value })}
          />
        </div>
        <Checkbox
          label="Active (customers can use it)"
          checked={f.active}
          onChange={(e) => setF({ ...f, active: e.target.checked })}
        />
        <Checkbox
          label="Show in the user's checkout as an available offer"
          checked={f.listed}
          onChange={(e) => setF({ ...f, listed: e.target.checked })}
        />
        <p className="-mt-3 text-xs text-muted">
          Untick this for a private code (e.g. for one customer): it still works, but only when the
          user types it in.
        </p>
        <div className="rounded-2xl bg-brand-soft p-4 text-sm text-link">
          <p className="mb-1 text-xs font-bold tracking-[0.08em] uppercase opacity-80">Preview</p>
          <b>{payload.code || '—'}</b> ·{' '}
          {f.type === 'percent' ? `${f.value || 0}%` : `₹${f.value || 0}`} off{' '}
          {f.plans.join(', ') || 'no plan'} · {label} · {f.max || '∞'} uses
          {f.from && f.until ? ` · ${f.from} → ${f.until}` : ''}
        </div>
        {(issue || err) && (
          <p role="alert" className="rounded-xl bg-bad-soft px-4 py-3 text-sm text-bad">
            {err || issue}
          </p>
        )}
      </Modal>
      <ConfirmDialog
        open={!!act}
        title={act?.kind === 'archive' ? 'Archive this coupon?' : 'Deactivate this coupon?'}
        confirmLabel={act?.kind === 'archive' ? 'Archive coupon' : 'Deactivate coupon'}
        icon="close"
        loading={busy}
        body={
          act?.kind === 'archive' ? (
            <>
              <b>{act?.c.code}</b> will stop working at checkout and move to the archive. Existing
              redemptions are kept.
            </>
          ) : (
            <>
              <b>{act?.c.code}</b> will stop working at checkout until you activate it again.
            </>
          )
        }
        onCancel={() => setAct(null)}
        onConfirm={() =>
          run(
            () =>
              api(`/api/coupons/${act!.c.id}`, {
                method: 'PATCH',
                body: act!.kind === 'archive' ? { archived: true } : { active: false },
              }),
            act!.kind === 'archive' ? 'Coupon archived' : 'Coupon deactivated',
            () => setAct(null),
          )
        }
      />
      <ConfirmDialog
        open={!!del}
        title="Delete coupon?"
        confirmLabel="Delete coupon"
        loading={busy}
        body={`${del?.code} has never been redeemed and will be permanently removed.`}
        onCancel={() => setDel(null)}
        onConfirm={() =>
          run(
            () => api(`/api/coupons/${del!.id}`, { method: 'DELETE' }),
            'Coupon deleted',
            () => setDel(null),
          )
        }
      />
    </div>
  );
}
