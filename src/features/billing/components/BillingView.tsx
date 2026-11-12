'use client';

import { useState } from 'react';
import { FadeSwitch } from '@/components/motion/presence';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { CouponsTab } from './CouponsTab';
import { PaymentsTab } from './PaymentsTab';
import { PlansTab } from './PlansTab';

const TABS = [
  { value: 'Payments', label: 'Payments' },
  { value: 'Plans', label: 'Plans' },
  { value: 'Coupons', label: 'Coupons' },
] as const;

/** can* flags only drive UI visibility; BFF handlers enforce the permissions. Tabs sit directly above their content. */
export function BillingView({
  canRefund,
  canEditPlans,
  canEditCoupons,
}: {
  canRefund: boolean;
  canEditPlans: boolean;
  canEditCoupons: boolean;
}) {
  const [tab, setTab] = useState<(typeof TABS)[number]['value']>('Payments');
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-extrabold sm:text-4xl">Plans &amp; payments</h1>
        <p className="mt-1 text-sm text-muted">Subscriptions, invoices, plans and coupons</p>
      </header>
      <SegmentedControl aria-label="Section" options={TABS} value={tab} onChange={setTab} />
      <FadeSwitch id={tab}>
        {tab === 'Payments' && <PaymentsTab canRefund={canRefund} />}
        {tab === 'Plans' && <PlansTab canEdit={canEditPlans} />}
        {tab === 'Coupons' && <CouponsTab canEdit={canEditCoupons} />}
      </FadeSwitch>
    </div>
  );
}
