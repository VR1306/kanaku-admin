import { Suspense } from 'react';
import { PageGuard } from '@/lib/PageGuard';
import { UserDetailView } from '@/features/users/components/UserDetailView';

export const metadata = { title: 'User details' };

// `params` is request-time data: read it inside Suspense so the shell can stream instantly.
async function Details({ params }: { params: PageProps<'/users/[id]'>['params'] }) {
  const { id } = await params;
  return (
    <PageGuard permission="users.view">
      {({ can }) => (
        <UserDetailView
          id={id}
          caps={{
            write: can('users.write'),
            suspend: can('users.suspend'),
            reset: can('users.resetPassword'),
            plan: can('users.changePlan'),
            export: false,
            announce: false,
          }}
        />
      )}
    </PageGuard>
  );
}

export default function Page(props: PageProps<'/users/[id]'>) {
  return (
    <Suspense fallback={null}>
      <Details params={props.params} />
    </Suspense>
  );
}
