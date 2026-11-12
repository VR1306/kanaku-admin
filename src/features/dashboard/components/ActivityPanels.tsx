import Link from 'next/link';
import { Badge, type Tone } from '@/components/ui/Badge';
import { formatIST } from '@/utils/format';
import { inr } from '@/utils/pricing';
import type { DashboardData } from '@/types/dashboard';

const cardCls = 'rounded-[24px] border border-line bg-surface p-[27px]';
const initials = (n: string) =>
  n
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join('');

// Amounts are what was charged or refunded, including GST.
const KIND: Record<DashboardData['recent'][number]['kind'], { label: string; cls: string }> = {
  payment: { label: 'Paid', cls: 'text-ok' },
  signup: { label: 'New', cls: 'text-link' },
  failed: { label: 'Retry', cls: 'text-bad' },
  upgrade: { label: 'Upgraded', cls: 'text-ok' },
  refund: { label: 'Refund', cls: 'text-ink' },
};

export function RecentActivity({
  d,
  canViewPayments,
}: {
  d: DashboardData;
  canViewPayments: boolean;
}) {
  return (
    <section className={cardCls}>
      <div className="flex items-center justify-between">
        <h2 className="font-display text-xl font-bold">Recent sign-ups & payments</h2>
        {canViewPayments && (
          <Link href="/billing" className="text-[13px] font-semibold text-link underline">
            Activity →
          </Link>
        )}
      </div>
      <ul className="mt-2">
        {d.recent.map((r) => (
          <li
            key={r.name + r.at}
            className="flex items-center gap-3 border-t border-line-soft py-3 first:border-t-0"
          >
            <span
              aria-hidden
              className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-soft font-display text-[13px] font-bold text-link"
            >
              {initials(r.name)}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold">{r.name}</p>
              <p className="truncate text-[12.5px] text-muted">{r.detail}</p>
            </div>
            <div className="text-right">
              <p className={`text-[15px] font-bold ${KIND[r.kind].cls}`}>
                {r.amount
                  ? `${r.kind === 'refund' ? '−' : '+'}${inr(r.amount)}`
                  : KIND[r.kind].label}
              </p>
              <p className="text-[11px] text-muted">{formatIST(r.at)}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}

function Pill({ tone, children }: { tone: Tone; children: React.ReactNode }) {
  return <Badge tone={tone}>{children}</Badge>;
}

function ActionCard({
  href,
  title,
  pill,
  children,
}: {
  href: string | null;
  title: string;
  pill: React.ReactNode;
  children: React.ReactNode;
}) {
  const body = (
    <div className={`${cardCls} h-full transition-colors ${href ? 'hover:border-brand' : ''}`}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-xl font-bold">{title}</h2>
        {pill}
      </div>
      {children}
    </div>
  );
  return href ? (
    <Link href={href} className="block">
      {body}
    </Link>
  ) : (
    body
  );
}

const fmtReply = (min: number | null) =>
  min === null ? '—' : `${Math.floor(min / 60)} h ${min % 60} m`;

/** Open tickets, failed payments and pending admin invites — each links to its module when the role may open it. */
export function ActionCards({
  d,
  links,
}: {
  d: DashboardData;
  links: { support: boolean; payments: boolean; team: boolean };
}) {
  const a = d.actions;
  return (
    <div className="flex flex-col gap-[18px]">
      <ActionCard
        href={links.support ? '/support' : null}
        title="Open tickets"
        pill={
          a.slaBreaches > 0 ? (
            <Pill tone="red">{a.slaBreaches} past SLA</Pill>
          ) : (
            <Pill tone="green">On track</Pill>
          )
        }
      >
        <div className="mt-5 flex gap-9">
          <div>
            <p className="font-display text-[34px] leading-none font-bold">{a.openTickets}</p>
            <p className="mt-2 text-[13px] text-muted">open</p>
          </div>
          <div>
            <p className="font-display text-[34px] leading-none font-bold">
              {fmtReply(a.avgFirstReplyMin)}
            </p>
            <p className="mt-2 text-[13px] text-muted">avg first reply</p>
          </div>
        </div>
      </ActionCard>
      <ActionCard
        href={links.payments ? '/billing' : null}
        title="Failed payments"
        pill={<Pill tone="amber">This week</Pill>}
      >
        <p className="mt-5 font-display text-[34px] leading-none font-bold">{a.failedPayments}</p>
        <p className="mt-2 text-[13px] text-muted">Auto-retry runs every 24 hours</p>
      </ActionCard>
      <ActionCard
        href={links.team ? '/team' : null}
        title="Pending admin invites"
        pill={<Pill tone="blue">Team</Pill>}
      >
        <p className="mt-5 text-[15px] text-muted">
          {a.nextInvite
            ? `${a.nextInvite.email} · ${a.nextInvite.role} · expires in ${a.nextInvite.expiresInDays} day${a.nextInvite.expiresInDays === 1 ? '' : 's'}`
            : 'No pending invitations'}
        </p>
      </ActionCard>
    </div>
  );
}
