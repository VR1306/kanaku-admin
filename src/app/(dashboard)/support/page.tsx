import { PageGuard } from '@/lib/PageGuard';
import { SupportView } from '@/features/support/components/SupportView';

export default function Page() {
  return <PageGuard permission="support.manage">{() => <SupportView />}</PageGuard>;
}
