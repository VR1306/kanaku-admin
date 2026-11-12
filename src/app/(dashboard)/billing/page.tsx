import { PageGuard } from '@/lib/PageGuard';
import { BillingView } from '@/features/billing/components/BillingView';

export default function Page() {
  return (
    <PageGuard permission="payments.view">
      {({ can }) => (
        <BillingView
          canRefund={can('payments.refund')}
          canEditPlans={can('plans.write')}
          canEditCoupons={can('coupons.write')}
        />
      )}
    </PageGuard>
  );
}
