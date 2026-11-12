'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Icon } from '@/components/icons/icon';
import { Reveal } from '@/components/motion/reveal';
import { Input, Select } from '@/components/ui/Field';
import { Skeleton } from '@/components/ui/Skeleton';
import { useApi } from '@/hooks/useApi';
import type { DashboardData } from '@/types/dashboard';
import { ActionCards, RecentActivity } from './ActivityPanels';
import { PlanDonut, SignupsChart } from './Charts';
import { HeroCards } from './HeroCards';

const RANGES = [
  { value: '7d', label: 'Last 7 days' },
  { value: '30d', label: 'Last 30 days' },
  { value: '90d', label: 'Last 90 days' },
  { value: '12m', label: 'Last 12 months' },
  { value: 'custom', label: 'Custom range' },
];

interface Props {
  name: string;
  /** Pre-formatted on the server (request time), e.g. "WEDNESDAY, 11 NOVEMBER". */
  dateLabel: string;
  greeting: string;
  links: { support: boolean; payments: boolean; team: boolean; users: boolean };
}

export function DashboardView({ name, dateLabel, greeting, links }: Props) {
  const router = useRouter();
  const [range, setRange] = useState('30d');
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [q, setQ] = useState('');
  const customReady = range !== 'custom' || (from !== '' && to !== '' && from <= to);
  const { data, error, loading } = useApi<DashboardData>(
    customReady
      ? `/api/dashboard?${range === 'custom' ? `range=custom&from=${from}&to=${to}` : `range=${range}`}`
      : null,
  );

  return (
    <div className="space-y-6">
      <Reveal>
        <p className="text-[15px] font-bold tracking-[0.14em] text-muted uppercase">{dateLabel}</p>
        <h1 className="mt-1 text-3xl leading-tight font-bold sm:text-[40px]">
          {greeting}, {name}
        </h1>
        <div className="mt-4 flex flex-wrap items-center gap-2.5">
          <form
            role="search"
            className="relative w-[320px] max-w-full"
            onSubmit={(e) => {
              e.preventDefault();
              if (q.trim() && links.users) router.push(`/users?q=${encodeURIComponent(q.trim())}`);
            }}
          >
            <Icon
              name="search"
              size={18}
              className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-subtle"
            />
            <Input
              aria-label="Search users"
              placeholder="Search users, payments, tickets"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="h-12 pl-11"
            />
          </form>
          <Select
            aria-label="Date range"
            compact
            value={range}
            onChange={(e) => setRange(e.target.value)}
            options={RANGES}
            className="w-[170px]"
          />
          {range === 'custom' && (
            <>
              <Input
                aria-label="From date"
                placeholder="dd/mm/yyyy"
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="h-12 w-[160px]"
              />
              <Input
                aria-label="To date"
                placeholder="dd/mm/yyyy"
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                invalid={!!from && !!to && from > to}
                className="h-12 w-[160px]"
              />
            </>
          )}
        </div>
      </Reveal>
      {error && (
        <p role="alert" className="rounded-xl bg-bad-soft p-3 text-sm text-bad">
          {error}
        </p>
      )}
      {!customReady && <p className="text-sm text-muted">Choose a start and end date.</p>}
      {loading && !data ? (
        <Skeleton className="h-72 rounded-[24px]" />
      ) : (
        data && (
          <Reveal delay={0.05} className="space-y-[18px]">
            <HeroCards d={data} />
            <div className="grid grid-cols-1 gap-[18px] lg:grid-cols-[minmax(0,1.354fr)_minmax(0,1fr)]">
              <SignupsChart d={data} canViewUsers={links.users} />
              <PlanDonut d={data} canViewPlans={links.payments} />
            </div>
            <div className="grid grid-cols-1 gap-[18px] lg:grid-cols-[minmax(0,1.354fr)_minmax(0,1fr)]">
              <RecentActivity d={data} canViewPayments={links.payments} />
              <ActionCards d={data} links={links} />
            </div>
          </Reveal>
        )
      )}
    </div>
  );
}
