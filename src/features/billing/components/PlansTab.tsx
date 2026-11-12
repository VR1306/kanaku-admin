'use client';

import { useState } from 'react';
import { Icon } from '@/components/icons/icon';
import { ActionMenu, type MenuAction } from '@/components/ui/ActionMenu';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Checkbox, SelectField, TextArea, TextField } from '@/components/ui/Field';
import { ConfirmDialog, Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { Switch } from '@/components/ui/Switch';
import { useToast } from '@/components/ui/Toast';
import { useApi } from '@/hooks/useApi';
import { api, ApiError } from '@/lib/api-client';
import { inr, savingPct, withGst, yearlyFromMonthly, YEARLY_SAVING_PCT } from '@/utils/pricing';
import type { Plan } from '@/types/admin';
import { USER_MODULE_KEYS } from '@/constants/user-modules';
import { PlanAccessFields } from './PlanAccessFields';

const num = (v: string) => (v.trim() === '' ? null : Number(v));
const blank = {
  name: '',
  description: '',
  badge: '',
  visible: true,
  monthly: '',
  yearly: '',
  auto: true,
  gstPct: '18',
  gstMode: 'exclusive',
  applyToExisting: false,
  modules: [...USER_MODULE_KEYS] as string[],
  maxBudgets: '',
};

const price = (p: Plan, listed: number | null, unit: string) => {
  if (listed === null)
    return <span className="text-lg font-semibold text-muted">Price not set</span>;
  if (listed === 0) return <span>Free</span>;
  const t = withGst(listed, p.gstPct, p.gstMode);
  return (
    <div>
      <span>{inr(listed)}</span>
      <span className="font-sans text-sm font-semibold tracking-normal text-muted">
        {' '}
        /{unit}
        {p.gstMode === 'exclusive' ? ' + GST' : ' incl. GST'}
      </span>
      {p.gstMode === 'exclusive' && (
        <p className="font-sans text-xs font-normal tracking-normal text-muted">
          {inr(t.total)} with {p.gstPct}% GST
        </p>
      )}
    </div>
  );
};

export function PlansTab({ canEdit }: { canEdit: boolean }) {
  const { toast } = useToast();
  const { data, error, loading, reload } = useApi<Plan[]>('/api/plans');
  const [edit, setEdit] = useState<Plan | 'new' | null>(null);
  const [form, setForm] = useState(blank);
  const [del, setDel] = useState<Plan | null>(null);
  const [archive, setArchive] = useState<Plan | null>(null);
  const [typed, setTyped] = useState('');
  const [needsConfirm, setNeedsConfirm] = useState('');
  const [busy, setBusy] = useState(false);

  const openNew = () => {
    setEdit('new');
    setNeedsConfirm('');
    setForm(blank);
  };
  const open = (p: Plan) => {
    setEdit(p);
    setNeedsConfirm('');
    const auto =
      p.monthly !== null && p.yearly !== null && p.yearly === yearlyFromMonthly(p.monthly);
    setForm({
      name: p.name,
      description: p.description,
      badge: p.badge,
      visible: p.visible,
      monthly: p.monthly?.toString() ?? '',
      yearly: p.yearly?.toString() ?? '',
      auto: auto || p.yearly === null,
      gstPct: String(p.gstPct),
      gstMode: p.gstMode,
      applyToExisting: false,
      modules: p.modules ?? [...USER_MODULE_KEYS],
      maxBudgets: p.maxBudgets == null ? '' : String(p.maxBudgets),
    });
  };
  const run = async (fn: () => Promise<unknown>, ok: string, done: () => void) => {
    setBusy(true);
    try {
      await fn();
      toast(ok);
      done();
      reload();
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Action failed');
    } finally {
      setBusy(false);
    }
  };

  const monthly = num(form.monthly);
  const yearly = form.auto
    ? monthly === null
      ? null
      : yearlyFromMonthly(monthly)
    : num(form.yearly);
  const gstPct = Number(form.gstPct) || 0;
  const mode = form.gstMode as 'exclusive' | 'inclusive';
  const saving = savingPct(monthly, yearly);
  const yearlyErr =
    monthly !== null && yearly !== null && yearly > monthly * 12
      ? 'Yearly can’t exceed 12 × monthly'
      : undefined;
  const creating = edit === 'new';

  const save = async (confirmExisting: boolean) => {
    setBusy(true);
    const body = {
      name: form.name,
      description: form.description,
      badge: form.badge,
      visible: form.visible,
      monthly,
      yearly,
      gstPct,
      gstMode: mode,
      modules: form.modules,
      maxBudgets: form.modules.includes('budgets') ? num(form.maxBudgets) : null,
    };
    try {
      if (creating) await api('/api/plans', { body });
      else
        await api(`/api/plans/${(edit as Plan).id}`, {
          method: 'PUT',
          body: { ...body, applyToExisting: form.applyToExisting, confirmExisting },
        });
      toast(creating ? 'Plan created' : 'Plan saved as a new version');
      setEdit(null);
      reload();
    } catch (e) {
      if (e instanceof ApiError && e.code === 'needs_confirmation') setNeedsConfirm(e.message);
      else toast(e instanceof ApiError ? e.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  };

  const menu = (p: Plan): MenuAction[] => [
    { label: 'Edit plan', icon: 'edit', onSelect: () => open(p) },
    {
      label: 'Duplicate',
      icon: 'plus',
      onSelect: () =>
        run(
          () => api(`/api/plans/${p.id}`, { body: { action: 'duplicate' } }),
          'Plan duplicated',
          () => {},
        ),
    },
    ...(p.status === 'live'
      ? [{ label: 'Archive', icon: 'close' as const, onSelect: () => setArchive(p) }]
      : []),
    {
      label: 'Delete',
      icon: 'trash',
      danger: true,
      onSelect: () => {
        setDel(p);
        setTyped('');
      },
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted">
          Tiers, prices and what each plan includes. Saving a change creates a new version.
        </p>
        {canEdit && (
          <Button onClick={openNew}>
            <Icon name="plus" size={18} strokeWidth={2.4} />
            New plan
          </Button>
        )}
      </div>
      {error && !data && (
        <p role="alert" className="rounded-xl bg-bad-soft p-4 text-sm text-bad">
          {error}{' '}
          <button className="font-semibold underline" onClick={reload}>
            Try again
          </button>
        </p>
      )}
      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {loading &&
          Array.from({ length: 3 }, (_, i) => <Skeleton key={i} className="h-72 rounded-[24px]" />)}
        {data?.map((p) => {
          const s = savingPct(p.monthly, p.yearly);
          return (
            <Card key={p.id} className="flex flex-col gap-4 p-6">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-display text-xl font-bold">{p.name}</h3>
                  <p className="mt-0.5 text-sm text-muted">{p.description}</p>
                </div>
                {canEdit && <ActionMenu label={`Actions for ${p.name}`} actions={menu(p)} />}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge tone={p.status === 'live' ? 'green' : 'gray'}>
                  {p.status === 'live' ? 'Live' : 'Archived'}
                </Badge>
                {p.badge && <Badge tone="cyan">{p.badge}</Badge>}
                {!p.visible && <Badge tone="amber">Hidden on site</Badge>}
              </div>
              <div className="font-display text-[32px] leading-tight font-bold">
                {price(p, p.monthly, 'month')}
              </div>
              {p.yearly !== null && p.yearly > 0 && (
                <div className="rounded-2xl bg-canvas p-3 text-sm">
                  <div className="font-display text-lg font-bold">{price(p, p.yearly, 'year')}</div>
                  {s !== null && (
                    <p className="mt-1 text-xs font-semibold text-ok">
                      Saves {s}% vs paying monthly
                    </p>
                  )}
                </div>
              )}
              <p className="mt-auto text-xs text-muted">
                {p.subscribers.toLocaleString('en-IN')} subscribers · version {p.version}
              </p>
              {canEdit && (
                <Button variant="outline" onClick={() => open(p)}>
                  Edit plan
                </Button>
              )}
            </Card>
          );
        })}
      </div>

      <Modal
        open={!!edit}
        variant="drawer"
        width="lg"
        busy={busy}
        title={creating ? 'New plan' : `Edit plan · ${(edit as Plan | null)?.name ?? ''}`}
        subtitle={
          creating
            ? 'Appears in Plans & payments and (if visible) on the pricing page.'
            : 'Saving creates a new version. Existing invoices keep the old price.'
        }
        onClose={() => setEdit(null)}
        footer={
          <>
            <Button variant="outline" onClick={() => setEdit(null)} disabled={busy}>
              Cancel
            </Button>
            <Button
              loading={busy}
              disabled={!form.name.trim() || !!yearlyErr}
              onClick={() => save(false)}
            >
              {creating ? 'Create plan' : 'Save plan'}
            </Button>
          </>
        }
      >
        <section className="space-y-5">
          <h3 className="font-display text-lg font-bold">Details</h3>
          <TextField
            label="Plan name"
            placeholder="e.g. Pro"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <TextArea
            label="Short description"
            rows={2}
            placeholder="One line shown under the plan name"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <TextField
              label="Highlight badge"
              placeholder="e.g. Most popular"
              maxLength={24}
              value={form.badge}
              onChange={(e) => setForm({ ...form, badge: e.target.value })}
            />
            <div className="flex flex-col justify-end gap-2">
              <span className="text-sm font-semibold">Show on pricing page</span>
              <div className="flex h-[54px] items-center gap-3">
                <Switch
                  aria-label="Show on pricing page"
                  checked={form.visible}
                  onChange={(v) => setForm({ ...form, visible: v })}
                />
                <span className="text-sm text-muted">{form.visible ? 'Visible' : 'Hidden'}</span>
              </div>
            </div>
          </div>
        </section>
        <section className="space-y-5 border-t border-line-soft pt-6">
          <h3 className="font-display text-lg font-bold">Pricing</h3>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <TextField
              label="Monthly price (₹)"
              type="number"
              min="0"
              placeholder="e.g. 199"
              value={form.monthly}
              onChange={(e) => setForm({ ...form, monthly: e.target.value })}
            />
            <TextField
              label="Yearly price (₹)"
              type="number"
              min="0"
              placeholder="e.g. 1910"
              disabled={form.auto}
              value={form.auto ? (yearly ?? '') : form.yearly}
              onChange={(e) => setForm({ ...form, yearly: e.target.value })}
              error={yearlyErr}
              hint={saving !== null ? `Saves ${saving}% vs monthly` : undefined}
            />
          </div>
          <Checkbox
            checked={form.auto}
            onChange={(e) => setForm({ ...form, auto: e.target.checked })}
            label={`Calculate yearly automatically (12 months less ${YEARLY_SAVING_PCT}%)`}
          />
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <SelectField
              label="GST"
              value={form.gstMode}
              onChange={(e) => setForm({ ...form, gstMode: e.target.value })}
              options={[
                { value: 'exclusive', label: 'Exclusive — price + GST' },
                { value: 'inclusive', label: 'Inclusive — GST in the price' },
              ]}
            />
            <TextField
              label="GST rate (%)"
              type="number"
              min="0"
              max="28"
              placeholder="18"
              value={form.gstPct}
              onChange={(e) => setForm({ ...form, gstPct: e.target.value })}
            />
          </div>
          <PlanAccessFields
            modules={form.modules}
            maxBudgets={form.maxBudgets}
            onModules={(modules) => setForm({ ...form, modules })}
            onMaxBudgets={(maxBudgets) => setForm({ ...form, maxBudgets })}
          />
          {monthly !== null && monthly > 0 && (
            <dl className="divide-y divide-line-soft rounded-2xl border border-line text-sm">
              {(
                [
                  ['Monthly', monthly],
                  ['Yearly', yearly],
                ] as const
              ).map(([label, v]) => {
                if (v === null) return null;
                const t = withGst(v, gstPct, mode);
                return (
                  <div
                    key={label}
                    className="flex flex-wrap items-center justify-between gap-2 px-4 py-3"
                  >
                    <dt className="font-semibold">{label}</dt>
                    <dd className="text-muted">
                      {inr(t.net)} + {inr(t.gst)} GST = <b className="text-ink">{inr(t.total)}</b>
                    </dd>
                  </div>
                );
              })}
            </dl>
          )}
          {!creating && (
            <label className="flex items-start gap-3 rounded-2xl bg-warn-soft p-4 text-sm text-warn">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={form.applyToExisting}
                onChange={(e) => setForm({ ...form, applyToExisting: e.target.checked })}
              />
              Also apply new prices to existing subscribers at their next renewal
            </label>
          )}
        </section>
      </Modal>
      <ConfirmDialog
        open={!!needsConfirm}
        title="Change pricing for existing subscribers?"
        confirmLabel="Confirm and save"
        tone="primary"
        loading={busy}
        body={needsConfirm}
        onCancel={() => setNeedsConfirm('')}
        onConfirm={() => {
          setNeedsConfirm('');
          save(true);
        }}
      />
      <ConfirmDialog
        open={!!archive}
        title="Archive this plan?"
        confirmLabel="Archive plan"
        loading={busy}
        icon="close"
        body={
          <>
            Archiving <b>{archive?.name}</b> hides it from the pricing page and stops new sign-ups.
            Existing subscribers keep it.
          </>
        }
        onCancel={() => setArchive(null)}
        onConfirm={() =>
          run(
            () => api(`/api/plans/${archive!.id}`, { body: { action: 'archive' } }),
            'Plan archived',
            () => setArchive(null),
          )
        }
      />
      <Modal
        open={!!del}
        title="Delete plan?"
        busy={busy}
        onClose={() => setDel(null)}
        footer={
          <>
            <Button variant="outline" onClick={() => setDel(null)} disabled={busy}>
              Cancel
            </Button>
            <Button
              variant="danger"
              loading={busy}
              disabled={typed !== del?.name}
              onClick={() =>
                run(
                  () =>
                    api(`/api/plans/${del!.id}`, {
                      method: 'DELETE',
                      body: { confirmName: typed },
                    }),
                  'Plan deleted',
                  () => setDel(null),
                )
              }
            >
              Delete plan
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted">
          Plans with subscribers can&apos;t be deleted — archive them instead. To delete an unused
          plan, type its name to confirm.
        </p>
        <TextField
          label="Type the plan name"
          placeholder={del?.name}
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
        />
      </Modal>
    </div>
  );
}
