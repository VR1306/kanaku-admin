import { Suspense } from 'react';
import { CardShell } from '@/features/auth/components/AuthShell';
import { SetupFlow } from '@/features/auth/components/SetupFlow';

export const metadata = { title: 'Set up your account' };

export default function Page() {
  return (
    <CardShell>
      <Suspense fallback={null}>
        <SetupFlow />
      </Suspense>
    </CardShell>
  );
}
