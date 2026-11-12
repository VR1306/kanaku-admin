'use client';

import { useState } from 'react';
import { Icon } from '@/components/icons/icon';
import { FadeSwitch } from '@/components/motion/presence';
import { Button } from '@/components/ui/Button';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { MembersTab } from './MembersTab';
import { RolesTab } from './RolesTab';

const TABS = [
  { value: 'Members', label: 'Members' },
  { value: 'Roles', label: 'Roles & permissions' },
] as const;

/**
 * Layout order: page header (title + primary action) → tabs → content. The tabs sit directly above the
 * table/matrix, not above the page-level action buttons.
 */
export function TeamView({ isSuper }: { isSuper: boolean }) {
  const [tab, setTab] = useState<(typeof TABS)[number]['value']>('Members');
  const [addOpen, setAddOpen] = useState(false);
  const [roleOpen, setRoleOpen] = useState(false);
  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-3xl font-extrabold sm:text-4xl">Team &amp; roles</h1>
          <p className="mt-1 text-sm text-muted">
            Who can use the admin console and what they can do
          </p>
        </div>
        {tab === 'Members' ? (
          <Button onClick={() => setAddOpen(true)}>
            <Icon name="plus" size={18} strokeWidth={2.4} />
            Add member
          </Button>
        ) : (
          <Button variant="outline" onClick={() => setRoleOpen(true)}>
            <Icon name="plus" size={18} strokeWidth={2.4} />
            Create role
          </Button>
        )}
      </header>
      <SegmentedControl aria-label="Team section" options={TABS} value={tab} onChange={setTab} />
      <FadeSwitch id={tab}>
        {tab === 'Members' ? (
          <MembersTab isSuper={isSuper} add={addOpen} onAddChange={setAddOpen} />
        ) : (
          <RolesTab create={roleOpen} onCreateChange={setRoleOpen} />
        )}
      </FadeSwitch>
    </div>
  );
}
