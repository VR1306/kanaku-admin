'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Checkbox, SelectField, TextField } from '@/components/ui/Field';
import { ConfirmDialog, Modal } from '@/components/ui/Modal';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { useApi } from '@/hooks/useApi';
import { api } from '@/lib/api-client';
import { formatDate } from '@/utils/format';
import { inr } from '@/utils/pricing';
import { PLAN_LABEL, PLAN_RANK, type AppUser, type PlanId } from '@/types/users';

import { Choice, PLAN_OPTIONS, msg } from './modal-shared';

interface Preview {
  from: string;
  to: string;
  price: { net: number; gst: number; total: number };
  due: { credit: number; net: number; gst: number; total: number } | null;
  note: string | null;
  gstMode: string;
  gstPct: number;
}

export function ChangePlanModal({
  user,
  onClose,
  onDone,
}: {
  user: AppUser | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const { toast } = useToast();
  const prices = useApi<{ monthly: number; yearly: number; gstPct: number; gstMode: string }>(
    user ? '/api/plans/prices' : null,
  );
  const [plan, setPlan] = useState<PlanId | ''>('');
  const [effective, setEffective] = useState<'now' | 'renewal'>('now');
  const [reason, setReason] = useState('');
  const [notify, setNotify] = useState(true);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const target = plan || user?.plan;
  const downgrade = !!user && !!target && PLAN_RANK[target] < PLAN_RANK[user.plan];
  const preview = useApi<Preview>(
    user && target && target !== user.plan
      ? `/api/users/${user.id}/plan-preview?plan=${target}&effective=${effective}`
      : null,
  );
  const gst = prices.data
    ? prices.data.gstMode === 'exclusive'
      ? ` + ${prices.data.gstPct}% GST`
      : ' incl. GST'
    : '';
  const priceOf = (p: PlanId) =>
    !prices.data
      ? ''
      : p === 'starter'
        ? 'Free'
        : p === 'pro_monthly'
          ? `${inr(prices.data.monthly)} /month${gst}`
          : `${inr(prices.data.yearly)} /year${gst} · save 20%`;

  async function submit() {
    setBusy(true);
    try {
      await api(`/api/users/${user!.id}/plan`, {
        body: { plan: target, effective, reason: reason || undefined, notify },
      });
      toast('Plan changed');
      onClose();
      onDone();
      setPlan('');
      setReason('');
      setErr('');
    } catch (e) {
      setErr(msg(e));
    } finally {
      setBusy(false);
    }
  }
  const p = preview.data;
  return (
    <Modal
      open={!!user}
      variant="drawer"
      busy={busy}
      title="Change subscription plan"
      subtitle={
        user
          ? `${user.name} · currently ${PLAN_LABEL[user.plan]}${user.renewsOn ? ` · renews ${formatDate(user.renewsOn)}` : ''}`
          : undefined
      }
      onClose={onClose}
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button disabled={!user || target === user.plan} loading={busy} onClick={submit}>
            Change plan
          </Button>
        </>
      }
    >
      {prices.loading && (
        <div className="space-y-3" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-[76px] rounded-2xl" />
          ))}
        </div>
      )}
      <div className="space-y-3" role="radiogroup" aria-label="New plan" hidden={prices.loading}>
        {PLAN_OPTIONS.map((o) => (
          <Choice
            key={o.value}
            name="plan"
            checked={target === o.value}
            onChange={() => setPlan(o.value as PlanId)}
            title={o.label}
            hint={priceOf(o.value as PlanId)}
          />
        ))}
      </div>
      <SelectField
        label="When should it take effect?"
        value={effective}
        onChange={(e) => setEffective(e.target.value as 'now' | 'renewal')}
        options={[
          { value: 'now', label: 'Immediately (prorated)' },
          { value: 'renewal', label: 'At next renewal' },
        ]}
      />
      {p && (
        <div className="rounded-2xl border border-line bg-canvas p-4 text-sm">
          <p className="mb-2 text-xs font-bold tracking-[0.08em] text-muted uppercase">
            Estimated charge
          </p>
          {p.due ? (
            <dl className="space-y-1.5">
              <div className="flex justify-between">
                <dt className="text-muted">
                  {p.to} price{p.gstMode === 'exclusive' ? ' (before GST)' : ''}
                </dt>
                <dd>{inr(p.price.net)}</dd>
              </div>
              {p.due.credit > 0 && (
                <div className="flex justify-between">
                  <dt className="text-muted">Credit for unused {p.from}</dt>
                  <dd className="text-ok">− {inr(p.due.credit)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-muted">GST ({p.gstPct}%)</dt>
                <dd>{inr(p.due.gst)}</dd>
              </div>
              <div className="flex justify-between border-t border-line pt-2 text-base font-bold">
                <dt>Due today</dt>
                <dd>{inr(p.due.total)}</dd>
              </div>
            </dl>
          ) : (
            <p className="text-muted">{p.note}</p>
          )}
          <p className="mt-3 text-xs text-muted">
            Estimate only — the billing service calculates the final amount when the change is
            applied.
          </p>
        </div>
      )}
      {downgrade && (
        <p role="alert" className="rounded-2xl bg-warn-soft p-4 text-sm text-warn">
          Downgrading removes Pro entitlements (unlimited budgets, receipt vault, PDF exports, smart
          alerts) from this user.
        </p>
      )}
      <TextField
        label="Reason (optional)"
        placeholder="e.g. Customer asked to switch to yearly"
        value={reason}
        onChange={(e) => setReason(e.target.value)}
      />
      <Checkbox
        checked={notify}
        onChange={(e) => setNotify(e.target.checked)}
        label="Email the user about this change"
      />
      {err && (
        <p role="alert" className="rounded-xl bg-bad-soft px-4 py-3 text-sm text-bad">
          {err}
        </p>
      )}
    </Modal>
  );
}

export type StatusAction = { user: AppUser; to: 'active' | 'inactive' | 'suspended' } | null;

export function StatusConfirm({
  action,
  onClose,
  onDone,
}: {
  action: StatusAction;
  onClose: () => void;
  onDone: () => void;
}) {
  const { toast } = useToast();
  const [reason, setReason] = useState('Payment term expired');
  const [notify, setNotify] = useState(true);
  const [busy, setBusy] = useState(false);
  if (!action)
    return (
      <ConfirmDialog
        open={false}
        title=""
        body=""
        confirmLabel=""
        onConfirm={() => {}}
        onCancel={onClose}
      />
    );
  const { user, to } = action;
  const suspending = to === 'suspended';
  const text = {
    suspended: `${user.name} will be signed out everywhere and can’t sign in until reinstated. Their data is kept. Billing pauses at the end of the current period.`,
    inactive: `${user.name} will become Inactive. They can’t sign in, but you can re-enable the account any time. Their plan keeps running.`,
    active: `${user.name} will become Active and can sign in again.`,
  }[to];
  return (
    <ConfirmDialog
      open
      title={
        {
          suspended: 'Suspend this user?',
          inactive: 'Disable this account?',
          active: user.status === 'suspended' ? 'Reinstate this user?' : 'Re-enable this account?',
        }[to]
      }
      confirmLabel={
        { suspended: 'Suspend user', inactive: 'Disable account', active: 'Confirm' }[to]
      }
      tone={suspending ? 'danger' : 'primary'}
      loading={busy}
      onCancel={onClose}
      onConfirm={async () => {
        setBusy(true);
        try {
          await api(`/api/users/${user.id}/status`, {
            body: { status: to, reason: suspending ? reason : undefined, notify },
          });
          toast(`${user.name}: ${to}`);
          onClose();
          onDone();
        } catch (e) {
          toast(msg(e));
        } finally {
          setBusy(false);
        }
      }}
      body={
        <div className="space-y-4">
          <p>{text}</p>
          {suspending && (
            <SelectField
              label="Reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              options={[
                'Payment term expired',
                'Policy violation',
                'Fraud suspected',
                'User request',
              ].map((r) => ({ value: r, label: r }))}
            />
          )}
          <Checkbox
            checked={notify}
            onChange={(e) => setNotify(e.target.checked)}
            label="Email the user (with a support link)"
          />
        </div>
      }
    />
  );
}
