import 'server-only';
import { col } from '@/lib/db';
import { payments, proPrices } from '@/services/billing';
import { listMembers } from '@/services/identity';
import { roleLabel } from '@/services/roles';
import * as support from '@/services/support';
import type { AppUser } from '@/types/users';
import type { DashboardData } from '@/types/dashboard';

// Dashboard metrics are aggregated live from the user directory, payments and support stores — no sample figures.
const DAYS: Record<string, number> = { '7d': 7, '30d': 30, '90d': 90, '12m': 365 };
const iso = (d: Date) => d.toISOString().slice(0, 10);
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export async function getDashboard(
  range: string,
  from?: string,
  to?: string,
): Promise<DashboardData> {
  const end = range === 'custom' && to ? new Date(`${to}T23:59:59.999Z`) : new Date();
  const start =
    range === 'custom' && from
      ? new Date(`${from}T00:00:00Z`)
      : new Date(end.getTime() - (DAYS[range] ?? 30) * 86400_000);
  const users = await col<AppUser & { _id: string }>('app_users');
  // Every source is independent: fetch them all in one wave (this used to be two sequential waves, ~450 ms).
  const [prices, all, recentUsers, allPay, tickets, members] = await Promise.all([
    proPrices(),
    users.find({}, { projection: { status: 1, plan: 1, joined: 1 } }).toArray(),
    users.find().sort({ joined: -1 }).limit(5).toArray(),
    payments.list({}, { at: -1 }),
    support.listLight(),
    listMembers(),
  ]);

  const paying = all.filter((u) => u.plan !== 'starter' && u.status !== 'suspended');
  const unit = (p: string) => (p === 'pro_yearly' ? prices.yearly / 12 : prices.monthly);
  const mrr = Math.round(paying.reduce((n, u) => n + unit(u.plan), 0));
  const monthAgo = iso(new Date(Date.now() - 30 * 86400_000));
  const prevMrr = Math.round(
    paying.filter((u) => u.joined <= monthAgo).reduce((n, u) => n + unit(u.plan), 0),
  );
  const inRange = (at: string) => at >= start.toISOString() && at <= end.toISOString();

  const monthly: DashboardData['monthly'] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth() - i, 1));
    const key = d.toISOString().slice(0, 7);
    monthly.push({
      month: MONTHS[d.getUTCMonth()],
      signups: all.filter((u) => u.joined.startsWith(key)).length,
      conversions: allPay.filter((p) => p.status === 'paid' && p.at.startsWith(key)).length,
    });
  }

  const label = (kind: string, p: { plan: string; method: string }) =>
    kind === 'payment'
      ? `Paid · ${p.plan} · ${p.method}`
      : kind === 'failed'
        ? `Payment failed · ${p.plan} · ${p.method}`
        : `Refund issued · ${p.plan}`;
  const kindOf = (s: string) =>
    (s === 'paid' ? 'payment' : s === 'failed' ? 'failed' : 'refund') as
      'payment' | 'failed' | 'refund';
  const recent: DashboardData['recent'] = [
    ...allPay.slice(0, 5).map((p) => ({
      name: p.user,
      kind: kindOf(p.status),
      detail: label(kindOf(p.status), p),
      amount: p.amount,
      at: p.at,
    })),
    ...recentUsers.map((u) => ({
      name: u.name,
      kind: 'signup' as const,
      detail: `Signed up · ${u.plan === 'starter' ? 'Starter' : 'Pro'}`,
      at: `${u.joined}T00:00:00Z`,
    })),
  ]
    .sort((a, b) => b.at.localeCompare(a.at))
    .slice(0, 5);

  const count = (f: (u: (typeof all)[number]) => boolean) => all.filter(f).length;
  return {
    range: range === 'custom' ? `${from} → ${to}` : range,
    mrr: {
      vsLabel: MONTHS[new Date(Date.now() - 30 * 86400_000).getUTCMonth()],
      value: mrr,
      changePct: prevMrr > 0 ? Math.round(((mrr - prevMrr) / prevMrr) * 1000) / 10 : 0,
      payingUsers: paying.length,
      conversionPct: all.length ? Math.round((paying.length / all.length) * 1000) / 10 : 0,
      refunds30d: Math.round(
        allPay
          .filter((p) => p.status === 'refunded' && inRange(p.at))
          .reduce((n, p) => n + p.amount, 0),
      ),
    },
    users: {
      active: count((u) => u.status === 'active'),
      total: all.length,
      newSignups: count((u) => u.joined >= iso(start) && u.joined <= iso(end)),
      invitedIncomplete: count((u) => u.status === 'invited'),
    },
    monthly,
    byPlanStatus: [
      {
        label: 'Starter · active',
        value: count((u) => u.plan === 'starter' && u.status === 'active'),
      },
      { label: 'Pro · active', value: count((u) => u.plan !== 'starter' && u.status === 'active') },
      { label: 'Inactive', value: count((u) => u.status === 'inactive') },
      { label: 'Suspended', value: count((u) => u.status === 'suspended') },
      { label: 'Invited', value: count((u) => u.status === 'invited') },
    ],
    recent,
    actions: await actionItems(
      allPay.filter((p) => p.status === 'failed').length,
      tickets,
      members,
    ),
  };
}

/** Action items are computed from the live support, billing and identity stores so they match the other screens. */
async function actionItems(
  failedPayments: number,
  tickets: support.TicketLite[],
  members: Awaited<ReturnType<typeof listMembers>>,
): Promise<DashboardData['actions']> {
  const open = tickets.filter((t) => t.status !== 'resolved' && t.status !== 'closed');
  const replied = tickets.filter((t) => t.firstResponseAt);
  const avg = replied.length
    ? Math.round(
        replied.reduce(
          (n, t) => n + (new Date(t.firstResponseAt!).getTime() - new Date(t.createdAt).getTime()),
          0,
        ) /
          replied.length /
          60_000,
      )
    : null;
  const pending = members.filter((m) => m.status === 'invited');
  const first = pending[0];
  return {
    openTickets: open.length,
    slaBreaches: open.filter((t) => support.slaBreached(t)).length,
    avgFirstReplyMin: avg,
    failedPayments,
    pendingInvites: pending.length,
    nextInvite: first
      ? {
          email: first.email,
          role: await roleLabel(first.role),
          expiresInDays: Math.max(
            0,
            Math.ceil(
              (new Date(first.invitedAt ?? Date.now()).getTime() + 72 * 3600_000 - Date.now()) /
                86_400_000,
            ),
          ),
        }
      : null,
  };
}
