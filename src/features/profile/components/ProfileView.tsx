'use client';

import { useState } from 'react';
import { FadeSwitch } from '@/components/motion/presence';
import { Skeleton } from '@/components/ui/Skeleton';
import { useApi } from '@/hooks/useApi';
import { cn } from '@/utils/cn';
import type { ProfileData } from '../types';
import { AppearanceTab } from './AppearanceTab';
import { ProfileTab } from './ProfileTab';
import { SecurityTab } from './SecurityTab';

const TABS = ['Profile', 'Security', 'Appearance'] as const;

export function ProfileView() {
  const { data, error, loading, reload } = useApi<ProfileData>('/api/profile');
  const [tab, setTab] = useState<(typeof TABS)[number]>('Profile');
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-extrabold sm:text-4xl">Profile</h1>
        <p className="text-sm text-muted">Manage your details, password and sessions</p>
      </header>
      <div
        role="tablist"
        className="inline-flex gap-1 rounded-2xl border border-line bg-surface p-1"
      >
        {TABS.map((t) => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={cn(
              'rounded-xl px-4 py-2 text-sm font-semibold transition-colors',
              tab === t ? 'bg-brand text-white' : 'text-ink hover:bg-canvas',
            )}
          >
            {t}
          </button>
        ))}
      </div>
      {error && (
        <p role="alert" className="rounded-xl bg-bad-soft p-3 text-sm text-bad">
          {error}
        </p>
      )}
      {loading && !data ? (
        <Skeleton className="h-72" />
      ) : (
        data && (
          <FadeSwitch id={tab}>
            {tab === 'Profile' && (
              <ProfileTab key={data.name + data.phone + data.avatar} data={data} onSaved={reload} />
            )}
            {tab === 'Security' && <SecurityTab profile={data} />}
            {tab === 'Appearance' && <AppearanceTab />}
          </FadeSwitch>
        )
      )}
    </div>
  );
}
