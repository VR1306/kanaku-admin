import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import { Skeleton } from '@/components/ui/Skeleton';
import { ToastProvider } from '@/components/ui/Toast';
import { IdleWatcher } from '@/features/auth/components/IdleWatcher';
import { permissionsFor, roleLabel } from '@/lib/authz';
import { readSession } from '@/lib/session';
import { getAccount } from '@/services/identity';
import * as support from '@/services/support';

// Session is request-time data, so it must sit behind Suspense (Cache Components).
async function Gate({ children }: { children: React.ReactNode }) {
  const session = await readSession();
  if (!session || session.stage !== 'active') redirect('/login');
  const [acct, perms, label] = await Promise.all([
    getAccount(session.id),
    permissionsFor(session.role),
    roleLabel(session.role),
  ]);
  // Sidebar shows the live account (name/photo edits apply immediately), not the stale cookie copy.
  const user = {
    name: acct?.name ?? session.name,
    roleLabel: label,
    avatar: acct?.avatar ?? null,
  };
  const supportOpen = perms.includes('support.manage') ? await support.openCount() : 0;
  return (
    <AppShell user={user} permissions={perms} supportOpen={supportOpen}>
      {children}
      <IdleWatcher />
    </AppShell>
  );
}

export default function DashboardLayout({ children }: LayoutProps<'/'>) {
  return (
    <ToastProvider>
      <Suspense
        fallback={
          <div className="p-8">
            <Skeleton className="h-10 w-64" />
          </div>
        }
      >
        <Gate>{children}</Gate>
      </Suspense>
    </ToastProvider>
  );
}
