import { PageGuard } from '@/lib/PageGuard';
import { CmsEditor } from '@/features/cms/components/CmsEditor';

export default function Page() {
  return <PageGuard permission="cms.write">{() => <CmsEditor />}</PageGuard>;
}
