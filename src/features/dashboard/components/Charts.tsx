'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { EASE_OUT } from '@/constants/motion';
import { formatCount } from '@/utils/format';
import type { DashboardData } from '@/types/dashboard';

const SEG_COLORS = [
  'var(--color-brand)',
  'var(--color-cyan)',
  '#94a3b8',
  'var(--color-bad)',
  '#f59e0b',
];
const cardCls = 'rounded-[24px] border border-line bg-surface p-[27px]';

function CardHead({ title, href, link }: { title: string; href?: string | null; link: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h2 className="font-display text-xl font-bold">{title}</h2>
      {href && (
        <Link href={href} className="text-[13px] font-semibold text-link underline">
          {link}
        </Link>
      )}
    </div>
  );
}

/** Sign-ups (brand) and paid conversions (cyan) per month. The latest month is highlighted. */
export function SignupsChart({ d, canViewUsers }: { d: DashboardData; canViewUsers: boolean }) {
  const max = Math.max(...d.monthly.map((m) => m.signups), 1);
  const H = 175;
  return (
    <section className={`${cardCls} min-w-0`}>
      <CardHead
        title="Sign-ups and paid conversions"
        href={canViewUsers ? '/users' : null}
        link="All users →"
      />
      <p className="mt-3 flex items-center gap-5 text-[13px] text-muted">
        <span className="flex items-center gap-1.5">
          <i className="size-2.5 rounded-[3px] bg-brand" />
          Sign-ups
        </span>
        <span className="flex items-center gap-1.5">
          <i className="size-2.5 rounded-[3px] bg-cyan" />
          Upgraded to Pro
        </span>
      </p>
      <div
        className="mt-5 flex items-end justify-between gap-2"
        role="img"
        aria-label={`Monthly sign-ups and Pro upgrades: ${d.monthly.map((m) => `${m.month} ${m.signups} and ${m.conversions}`).join(', ')}`}
      >
        {d.monthly.map((m, i) => {
          const last = i === d.monthly.length - 1;
          return (
            <div key={m.month} className="flex min-w-0 flex-1 flex-col items-center">
              <span
                className={`mb-2 text-[13px] font-semibold ${last ? 'text-link' : 'text-muted'}`}
              >
                {formatCount(m.signups)}
              </span>
              <div
                className="flex w-full items-end justify-center gap-[3px] sm:gap-[6px]"
                style={{ height: H }}
              >
                <motion.div
                  className={`w-full max-w-[29px] min-w-[10px] flex-1 rounded-t-[10px] rounded-b-[4px] ${last ? 'bg-brand' : 'bg-brand-soft'}`}
                  style={{ height: (m.signups / max) * H, originY: 1 }}
                  initial={{ scaleY: 0 }}
                  animate={{ scaleY: 1 }}
                  transition={{ duration: 0.6, ease: EASE_OUT, delay: i * 0.05 }}
                  title={`${m.signups} sign-ups`}
                />
                <motion.div
                  className={`w-full max-w-[29px] min-w-[10px] flex-1 rounded-t-[10px] rounded-b-[4px] ${last ? 'bg-cyan' : 'bg-cyan-soft'}`}
                  style={{ height: Math.max(8, (m.conversions / max) * H), originY: 1 }}
                  initial={{ scaleY: 0 }}
                  animate={{ scaleY: 1 }}
                  transition={{ duration: 0.6, ease: EASE_OUT, delay: i * 0.05 + 0.05 }}
                  title={`${m.conversions} upgrades`}
                />
              </div>
              <span className={`mt-3 text-[13px] ${last ? 'font-bold text-link' : 'text-muted'}`}>
                {m.month}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/** Donut of users by plan & status with the legend alongside. */
export function PlanDonut({ d, canViewPlans }: { d: DashboardData; canViewPlans: boolean }) {
  const total = d.byPlanStatus.reduce((n, s) => n + s.value, 0);
  // Start at 12 o'clock (circumference is 100 for r=15.9); each segment begins where the previous ended.
  const segs = d.byPlanStatus.reduce<Array<{ label: string; len: number; offset: number }>>(
    (acc, s) => {
      const len = (s.value / total) * 100;
      const prev = acc.at(-1);
      return [...acc, { label: s.label, len, offset: prev ? prev.offset - prev.len : 25 }];
    },
    [],
  );
  return (
    <section className={`${cardCls} min-w-0`}>
      <CardHead
        title="Users by plan & status"
        href={canViewPlans ? '/billing' : null}
        link="Plans →"
      />
      <div className="mt-5 flex flex-wrap items-center gap-6">
        <div className="relative size-[150px] shrink-0">
          <svg
            viewBox="0 0 42 42"
            className="size-full -rotate-0"
            role="img"
            aria-label={`${formatCount(total)} users by plan and status`}
          >
            <circle
              cx="21"
              cy="21"
              r="15.9"
              fill="none"
              stroke="var(--color-line-soft)"
              strokeWidth="6"
            />
            {segs.map((s, i) => (
              <motion.circle
                key={s.label}
                cx="21"
                cy="21"
                r="15.9"
                fill="none"
                stroke={SEG_COLORS[i % SEG_COLORS.length]}
                strokeWidth="6"
                strokeDasharray={`${s.len} ${100 - s.len}`}
                strokeDashoffset={s.offset}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.1 * i, duration: 0.4 }}
              />
            ))}
          </svg>
          <div className="absolute inset-0 grid place-content-center text-center">
            <span className="text-[13px] text-muted">Total</span>
            <span className="font-display text-[22px] font-bold text-link">
              {formatCount(total)}
            </span>
          </div>
        </div>
        <ul className="min-w-[180px] flex-1 space-y-[14px] text-sm">
          {d.byPlanStatus.map((s, i) => (
            <li key={s.label} className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2">
                <i
                  className="size-2.5 rounded-full"
                  style={{ background: SEG_COLORS[i % SEG_COLORS.length] }}
                />
                {s.label}
              </span>
              <b>{formatCount(s.value)}</b>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
