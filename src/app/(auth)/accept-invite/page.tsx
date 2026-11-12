import { Suspense } from 'react';
import { CardShell } from '@/features/auth/components/AuthShell';
import { AcceptInvite } from '@/features/auth/components/AcceptInvite';

export const metadata = { title: 'Accept invitation' };

export default function Page() {
  return (
    <CardShell>
      <Suspense fallback={null}>
        <AcceptInvite />
      </Suspense>
    </CardShell>
  );
}
