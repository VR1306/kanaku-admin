import { PageGuard } from '@/lib/PageGuard';
import { TeamView } from '@/features/team/components/TeamView';

export default function Page() {
  return (
    <PageGuard permission="team.manage">
      {({ role }) => <TeamView isSuper={role === 'super_admin'} />}
    </PageGuard>
  );
}
