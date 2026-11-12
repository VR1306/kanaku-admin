import { PageGuard } from '@/lib/PageGuard';
import { UsersView } from '@/features/users/components/UsersView';

export default function UsersPage() {
  return (
    <PageGuard permission="users.view">
      {({ can }) => (
        <UsersView
          caps={{
            write: can('users.write'),
            suspend: can('users.suspend'),
            reset: can('users.resetPassword'),
            plan: can('users.changePlan'),
            export: can('users.export'),
            announce: can('announcements.write'),
          }}
        />
      )}
    </PageGuard>
  );
}
