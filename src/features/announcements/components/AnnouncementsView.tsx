'use client';

/* eslint-disable @next/next/no-img-element -- previews are user-supplied data URLs, not optimisable assets */
import { useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { Icon } from '@/components/icons/icon';
import { ActionMenu, type MenuAction } from '@/components/ui/ActionMenu';
import { Badge, type Tone } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { DataTable, type Column } from '@/components/ui/DataTable';
import { ConfirmDialog, Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { useApi } from '@/hooks/useApi';
import { api, ApiError } from '@/lib/api-client';
import {
  AUDIENCE_LABEL,
  CHANNEL_LABEL,
  type AnnStatus,
  type AnnouncementRow,
} from '@/types/announcements';
import {
  AnnouncementFields,
  AnnouncementFooter,
  blankForm,
  useAnnouncementForm,
  type FormState,
} from './AnnouncementForm';

const TONE: Record<AnnStatus, Tone> = {
  draft: 'gray',
  scheduled: 'blue',
  live: 'green',
  expired: 'amber',
};
const ist = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        day: '2-digit',
        month: 'short',
        hour: 'numeric',
        minute: '2-digit',
      })
    : '—';
const toForm = (a: AnnouncementRow): FormState => {
  const p = (iso: string | null) => {
    if (!iso) return ['', ''];
    const d = new Date(new Date(iso).getTime() + 5.5 * 3600_000).toISOString();
    return [d.slice(0, 10), d.slice(11, 16)];
  };
  const [publishDate, publishTime] = p(a.publishAt);
  const [expiryDate, expiryTime] = p(a.expiresAt);
  return {
    title: a.title,
    message: a.message,
    ctaLabel: a.ctaLabel,
    ctaHref: a.ctaHref,
    image: a.image,
    audience: a.audience,
    customUserIds: a.customUserIds,
    channels: a.channels,
    sendNow: false,
    publishDate,
    publishTime: publishTime || '10:00',
    expiryDate,
    expiryTime: expiryTime || '23:59',
    trigger: a.trigger,
    triggerValue: a.triggerValue,
    frequency: a.frequency,
  };
};

function Preview({ form }: { form: FormState }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-brand-soft/50">
      <p className="px-4 pt-3 text-[11px] font-bold tracking-[0.1em] text-muted uppercase">
        In-app preview
      </p>
      {form.image ? (
        <img
          src={form.image.dataUrl}
          alt={form.image.alt}
          className="mt-2 max-h-36 w-full object-cover"
        />
      ) : (
        <div className="mt-2 h-16 bg-gradient-to-r from-brand to-cyan" />
      )}
      <div className="space-y-1 p-4">
        <p className="font-bold">{form.title || 'Announcement title'}</p>
        <p className="text-sm text-muted">{form.message || 'Your message appears here.'}</p>
        {form.ctaLabel && (
          <span className="mt-2 inline-block rounded-[10px] bg-brand px-4 py-2 text-sm font-semibold text-white">
            {form.ctaLabel}
          </span>
        )}
      </div>
    </div>
  );
}

export function AnnouncementsView() {
  const { toast } = useToast();
  const users = useSearchParams().get('users')?.split(',').filter(Boolean) ?? [];
  const { data, error, loading, refreshing, reload } =
    useApi<AnnouncementRow[]>('/api/announcements');
  const [drawer, setDrawer] = useState<{ id: string | null } | null>(
    users.length ? { id: null } : null,
  );
  const [form, setForm] = useState<FormState>(blankForm(users));
  const [cancel, setCancel] = useState<AnnouncementRow | null>(null);
  const done = () => {
    setDrawer(null);
    setForm(blankForm());
    reload();
  };
  const ctl = useAnnouncementForm(form, drawer?.id ?? null, done);

  const menu = (a: AnnouncementRow): MenuAction[] => [
    ...(a.status === 'draft' || a.status === 'scheduled'
      ? [
          {
            label: 'Edit',
            icon: 'edit' as const,
            onSelect: () => {
              setForm(toForm(a));
              setDrawer({ id: a.id });
            },
          },
        ]
      : []),
    ...(a.status === 'scheduled'
      ? [
          {
            label: 'Cancel schedule',
            icon: 'close' as const,
            danger: true,
            onSelect: () => setCancel(a),
          },
        ]
      : []),
  ];
  const columns: Column<AnnouncementRow>[] = [
    {
      key: 't',
      header: 'Announcement',
      render: (a) => (
        <div className="max-w-[280px]">
          <p className="truncate font-semibold">{a.title}</p>
          <p className="truncate text-[13px] text-muted">{a.message}</p>
        </div>
      ),
    },
    {
      key: 'a',
      header: 'Audience',
      className: 'hidden md:table-cell',
      render: (a) => (
        <div>
          <p>{AUDIENCE_LABEL[a.audience]}</p>
          <p className="text-[13px] text-muted">Reach {a.reach.toLocaleString('en-IN')}</p>
        </div>
      ),
    },
    {
      key: 'c',
      header: 'Channels',
      className: 'hidden lg:table-cell',
      render: (a) => (
        <div className="text-muted">
          <p>{a.channels.map((c) => CHANNEL_LABEL[c]).join(' + ')}</p>
          {a.delivery && (
            <p className="text-[13px]" title="Deliveries across all channels">
              {a.delivery.sent} sent
              {a.delivery.pending > 0 && ` · ${a.delivery.pending} pending`}
              {a.delivery.failed > 0 && (
                <span className="text-bad"> · {a.delivery.failed} failed</span>
              )}
              {a.delivery.skipped > 0 && ` · ${a.delivery.skipped} skipped`}
            </p>
          )}
        </div>
      ),
    },
    {
      key: 'w',
      header: 'When (IST)',
      className: 'hidden md:table-cell',
      render: (a) => (
        <div className="whitespace-nowrap text-muted">
          <p>
            {a.status === 'scheduled'
              ? `Goes live ${ist(a.publishAt)}`
              : a.publishAt
                ? `Sent ${ist(a.publishAt)}`
                : 'Not scheduled'}
          </p>
          {a.expiresAt && <p className="text-[13px]">Expires {ist(a.expiresAt)}</p>}
        </div>
      ),
    },
    {
      key: 'o',
      header: 'Opened',
      className: 'hidden xl:table-cell',
      render: (a) => (
        <span className="text-muted">{a.openRatePct === null ? '—' : `${a.openRatePct}%`}</span>
      ),
    },
    {
      key: 's',
      header: 'Status',
      render: (a) => (
        <Badge tone={TONE[a.status]}>{a.status[0].toUpperCase() + a.status.slice(1)}</Badge>
      ),
    },
    {
      key: 'x',
      header: 'Actions',
      align: 'right',
      render: (a) =>
        menu(a).length ? (
          <div className="flex justify-end">
            <ActionMenu label={`Actions for ${a.title}`} actions={menu(a)} />
          </div>
        ) : (
          <span className="text-xs text-muted">—</span>
        ),
    },
  ];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold sm:text-4xl">Announcements</h1>
          <p className="mt-1 text-sm text-muted">
            Tell users about new features, offers and service notices
          </p>
        </div>
        <Button
          onClick={() => {
            setForm(blankForm(users));
            setDrawer({ id: null });
          }}
        >
          <Icon name="plus" size={18} strokeWidth={2.4} />
          New announcement
        </Button>
      </header>
      <Card className="overflow-hidden p-0">
        <DataTable
          caption="Announcements"
          loading={loading}
          refreshing={refreshing}
          error={error}
          onRetry={reload}
          columns={columns}
          rows={data ?? []}
          rowKey={(a) => a.id}
          emptyTitle="No announcements yet"
          emptyHint="Create one to reach users in-app, by email or push."
        />
      </Card>

      <Modal
        open={!!drawer}
        variant="drawer"
        width="lg"
        busy={ctl.busy}
        title={drawer?.id ? 'Edit announcement' : 'New announcement'}
        subtitle="Drafts and scheduled announcements can be edited until they go live."
        onClose={() => setDrawer(null)}
        footer={<AnnouncementFooter value={form} form={ctl} onCancel={() => setDrawer(null)} />}
      >
        <Preview form={form} />
        <AnnouncementFields value={form} onChange={setForm} issue={ctl.issue} />
      </Modal>
      <ConfirmDialog
        open={!!cancel}
        title="Cancel this announcement?"
        confirmLabel="Cancel announcement"
        body={`“${cancel?.title}” won’t be published. It returns to drafts.`}
        onCancel={() => setCancel(null)}
        onConfirm={async () => {
          try {
            await api(`/api/announcements/${cancel!.id}/cancel`, { body: {} });
            toast('Announcement cancelled');
            setCancel(null);
            reload();
          } catch (e) {
            toast(e instanceof ApiError ? e.message : 'Failed');
          }
        }}
      />
    </div>
  );
}
