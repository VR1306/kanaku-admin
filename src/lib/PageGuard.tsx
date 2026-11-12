import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { homeFor } from '@/lib/authz';
import { readSession } from '@/lib/session';
import { getAccount } from '@/services/identity';
import { permissionsFor } from '@/services/roles';
import type { Permission } from '@/types/auth';

interface Viewer {
  role: string;
  name: string;
  /** Synchronous check against the permissions resolved for this request. */
  can: (p: Permission) => boolean;
}

async function Check({
  permission,
  children,
}: {
  permission: Permission;
  children: (v: Viewer) => React.ReactNode;
}) {
  const s = await readSession();
  if (!s) redirect('/login');
  const [perms, acct] = await Promise.all([permissionsFor(s.role), getAccount(s.id)]);
  if (!perms.includes(permission)) redirect(homeFor(perms));
  return (
    <>{children({ role: s.role, name: acct?.name ?? s.name, can: (p) => perms.includes(p) })}</>
  );
}

/** Server-side page gate (UX redirect; BFF handlers still enforce permissions). */
export function PageGuard(props: {
  permission: Permission;
  children: (v: Viewer) => React.ReactNode;
}) {
  return (
    <Suspense fallback={null}>
      <Check {...props} />
    </Suspense>
  );
}
