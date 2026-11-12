import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { homeFor } from '@/lib/authz';
import { permissionsFor } from '@/services/roles';
import { readSession } from '@/lib/session';

async function Go() {
  const s = await readSession();
  return redirect(s?.stage === 'active' ? homeFor(await permissionsFor(s.role)) : '/login');
}

export default function Home() {
  return (
    <Suspense fallback={null}>
      <Go />
    </Suspense>
  );
}
