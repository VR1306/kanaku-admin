'use client';

import { CountUp } from '@/components/motion/presence';
import { formatCount, formatINR } from '@/utils/format';
import type { DashboardData } from '@/types/dashboard';

/** The two hero cards from the design: MRR (brand) and Active users (cyan). */
export function HeroCards({ d }: { d: DashboardData }) {
  const pct = Math.round((d.users.active / d.users.total) * 100);
  return (
    <div className="grid grid-cols-1 gap-[18px] lg:grid-cols-[minmax(0,1.354fr)_minmax(0,1fr)]">
      <section className="rounded-[24px] bg-brand p-7 text-on-inverse">
        <p className="text-[13px] font-bold tracking-[0.14em] text-cyan-pale">
          MONTHLY RECURRING REVENUE
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
          <CountUp
            value={d.mrr.value}
            format={(n) => formatINR(Math.round(n))}
            className="font-display text-4xl leading-none sm:text-[56px] font-bold"
          />
          <span className="rounded-full bg-cyan px-3 py-1 text-xs font-bold text-on-accent">
            ▲ {d.mrr.changePct}% vs {d.mrr.vsLabel}
          </span>
        </div>
        <dl className="mt-7 grid grid-cols-3 gap-4 border-t border-white/20 pt-5">
          <div>
            <dt className="text-[13px] text-brand-pale">Paying users</dt>
            <dd className="mt-1 font-display text-2xl font-bold">
              {formatCount(d.mrr.payingUsers)}
            </dd>
          </div>
          <div>
            <dt className="text-[13px] text-brand-pale">Conversion</dt>
            <dd className="mt-1 font-display text-2xl font-bold text-cyan">
              {d.mrr.conversionPct}%
            </dd>
          </div>
          <div>
            <dt className="text-[13px] text-brand-pale">Refunds (30 d)</dt>
            <dd className="mt-1 font-display text-2xl font-bold">{formatINR(d.mrr.refunds30d)}</dd>
          </div>
        </dl>
      </section>
      <section className="rounded-[24px] bg-cyan p-7 text-on-accent">
        <p className="text-[13px] font-bold tracking-[0.14em]">ACTIVE USERS</p>
        <CountUp
          value={d.users.active}
          format={(n) => formatCount(Math.round(n))}
          className="mt-3 block font-display text-4xl leading-none sm:text-[56px] font-bold"
        />
        <div
          className="mt-6 h-3 rounded-full bg-navy/20"
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Active share of accounts"
        >
          <div
            className="h-3 rounded-full bg-navy transition-[width] duration-700"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className="mt-3 text-[15px] font-medium">
          {pct}% of {formatCount(d.users.total)} accounts · {formatCount(d.users.newSignups)} new
          sign-ups this month
        </p>
        <p className="mt-4 rounded-xl bg-white/35 px-3.5 py-3 text-sm font-semibold">
          {formatCount(d.users.invitedIncomplete)} invited users haven&apos;t finished set-up
        </p>
      </section>
    </div>
  );
}
