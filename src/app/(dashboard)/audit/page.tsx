import { PageGuard } from '@/lib/PageGuard';
import { AuditView } from '@/features/audit/components/AuditView';

export default function Page() {
  return (
    <PageGuard permission="audit.view">
      {({ role }) => <AuditView isSuper={role === 'super_admin'} />}
    </PageGuard>
  );
}
