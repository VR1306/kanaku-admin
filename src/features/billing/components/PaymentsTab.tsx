'use client';

import { useState } from 'react';
import { ActionMenu, type MenuAction } from '@/components/ui/ActionMenu';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { DataTable, Identity, type Column } from '@/components/ui/DataTable';
import { Checkbox, SelectField, TextField } from '@/components/ui/Field';
import { Modal } from '@/components/ui/Modal';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { useToast } from '@/components/ui/Toast';
import { useApi } from '@/hooks/useApi';
import { api, ApiError } from '@/lib/api-client';
import { formatIST } from '@/utils/format';
import { inr } from '@/utils/pricing';
import type { Payment } from '@/types/admin';

const TONE = { paid: 'green', failed: 'red', refunded: 'gray' } as const;
const REASONS = ['Duplicate charge', 'Customer request', 'Service issue', 'Fraud'].map((r) => ({
  value: r,
  label: r,
}));
const FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'paid', label: 'Paid' },
  { value: 'failed', label: 'Failed' },
  { value: 'refunded', label: 'Refunded' },
] as const;

interface Resp {
  items: Payment[];
  counts: { failed: number; refunded: number; collected: number; payments: number };
}

export function PaymentsTab({ canRefund }: { canRefund: boolean }) {
  const { toast } = useToast();
  const [status, setStatus] = useState<(typeof FILTERS)[number]['value']>('all');
  const { data, error, loading, refreshing, reload } = useApi<Resp>(
    `/api/payments?status=${status}`,
  );
  const [target, setTarget] = useState<Payment | null>(null);
  const [type, setType] = useState<'full' | 'partial'>('full');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState(REASONS[0].value);
  const [cancel, setCancel] = useState(true);
  const [busy, setBusy] = useState(false);
  const [formErr, setFormErr] = useState('');

  async function act(fn: () => Promise<unknown>, ok: string) {
    setBusy(true);
    try {
      await fn();
      toast(ok);
      setTarget(null);
      setAmount('');
      setFormErr('');
      reload();
    } catch (e) {
      const m = e instanceof ApiError ? e.message : 'Action failed';
      setFormErr(m);
      toast(m);
    } finally {
      setBusy(false);
    }
  }

  const menu = (p: Payment): MenuAction[] => [
    {
      label: 'Copy payment ID',
      icon: 'check',
      onSelect: () => navigator.clipboard?.writeText(p.id).then(() => toast('Payment ID copied')),
    },
    ...(canRefund && p.status === 'paid'
      ? [
          {
            label: 'Refund',
            icon: 'payments' as const,
            danger: true,
            onSelect: () => {
              setTarget(p);
              setType('full');
              setFormErr('');
            },
          },
        ]
      : []),
    ...(canRefund && p.status === 'failed'
      ? [
          {
            label: 'Retry payment',
            icon: 'check' as const,
            onSelect: () =>
              act(() => api(`/api/payments/${p.id}/retry`, { body: {} }), 'Retry queued'),
          },
        ]
      : []),
  ];

  const columns: Column<Payment>[] = [
    {
      key: 'id',
      header: 'Payment ID',
      render: (p) => <code className="text-[13px] text-ink-2">{p.id}</code>,
    },
    { key: 'u', header: 'User', render: (p) => <Identity name={p.user} sub={p.plan} /> },
    {
      key: 'a',
      header: 'Amount',
      align: 'right',
      render: (p) => (
        <div>
          <p className="font-display font-bold">{inr(p.amount)}</p>
          <p className="text-[11px] text-muted">incl. GST</p>
        </div>
      ),
    },
    {
      key: 'm',
      header: 'Method',
      className: 'hidden 2xl:table-cell',
      render: (p) => <span className="text-muted">{p.method}</span>,
    },
    {
      key: 'd',
      header: 'Date',
      className: 'hidden xl:table-cell',
      render: (p) => <span className="whitespace-nowrap text-muted">{formatIST(p.at)}</span>,
    },
    {
      key: 's',
      header: 'Status',
      render: (p) => (
        <Badge tone={TONE[p.status]}>{p.status[0].toUpperCase() + p.status.slice(1)}</Badge>
      ),
    },
    {
      key: 'x',
      header: 'Actions',
      align: 'right',
      render: (p) => (
        <div className="flex justify-end">
          <ActionMenu label={`Actions for ${p.id}`} actions={menu(p)} />
        </div>
      ),
    },
  ];

  const partialInvalid =
    type === 'partial' && (!(Number(amount) > 0) || Number(amount) > (target?.amount ?? 0));
  const stat = (label: string, value: React.ReactNode, note: string) => (
    <Card>
      <p className="text-sm text-muted">{label}</p>
      <p className="mt-1 font-display text-3xl font-bold">{value}</p>
      <p className="mt-0.5 text-xs text-muted">{note}</p>
    </Card>
  );
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stat(
          'Collected',
          data ? inr(data.counts.collected) : '–',
          `${data?.counts.payments ?? 0} successful payments · incl. GST`,
        )}
        {stat('Failed', data?.counts.failed ?? '–', 'Auto-retry every 24 hours')}
        {stat('Refunded', data?.counts.refunded ?? '–', 'This month')}
      </div>
      <Card className="overflow-hidden p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line-soft p-5 md:px-7">
          <SegmentedControl
            aria-label="Payment status"
            options={FILTERS}
            value={status}
            onChange={setStatus}
          />
        </div>
        <DataTable
          caption="Payments"
          loading={loading}
          refreshing={refreshing}
          error={error}
          onRetry={reload}
          columns={columns}
          rows={data?.items ?? []}
          rowKey={(p) => p.id}
          emptyTitle="No payments"
          emptyHint="Payments matching this filter appear here."
        />
      </Card>
      <Modal
        open={!!target}
        busy={busy}
        title="Refund payment"
        subtitle="Refunds reach the customer in 5–7 working days via the gateway."
        onClose={() => setTarget(null)}
        footer={
          <>
            <Button variant="outline" onClick={() => setTarget(null)} disabled={busy}>
              Cancel
            </Button>
            <Button
              variant="danger"
              disabled={partialInvalid}
              loading={busy}
              onClick={() =>
                act(
                  () =>
                    api(`/api/payments/${target!.id}/refund`, {
                      body: {
                        type,
                        amount: type === 'partial' ? Number(amount) : undefined,
                        reason,
                        cancelAtPeriodEnd: cancel,
                      },
                    }),
                  'Refund issued',
                )
              }
            >
              Issue refund
            </Button>
          </>
        }
      >
        <div className="rounded-2xl bg-canvas p-4 text-sm">
          <p className="font-semibold">{target?.user}</p>
          <p className="text-muted">
            {target?.id} · {target?.plan} · {target?.method}
          </p>
          <p className="mt-2 font-display text-xl font-bold">
            {target && inr(target.amount)}{' '}
            <span className="text-xs font-normal text-muted">paid incl. GST</span>
          </p>
        </div>
        <SelectField
          label="Refund amount"
          value={type}
          onChange={(e) => setType(e.target.value as 'full' | 'partial')}
          options={[
            { value: 'full', label: 'Full refund' },
            { value: 'partial', label: 'Partial refund' },
          ]}
        />
        {type === 'partial' && (
          <TextField
            label="Amount (₹)"
            type="number"
            min="1"
            step="0.01"
            placeholder={`Up to ${target?.amount ?? ''}`}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            error={
              Number(amount) > (target?.amount ?? Infinity)
                ? 'Can’t exceed the amount paid'
                : undefined
            }
          />
        )}
        <SelectField
          label="Reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          options={REASONS}
        />
        <Checkbox
          checked={cancel}
          onChange={(e) => setCancel(e.target.checked)}
          label="Cancel the subscription at the end of the period"
        />
        {formErr && (
          <p role="alert" className="rounded-xl bg-bad-soft px-4 py-3 text-sm text-bad">
            {formErr}
          </p>
        )}
        <p className="text-xs text-muted">This is recorded in the audit log.</p>
      </Modal>
    </div>
  );
}
