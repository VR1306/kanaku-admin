import { Suspense } from 'react';
import { CardShell } from '@/features/auth/components/AuthShell';
import { MfaForm } from '@/features/auth/components/MfaForm';

export const metadata = { title: 'Two-step verification' };

export default function Page() {
  return (
    <CardShell>
      <Suspense fallback={null}>
        <MfaForm />
      </Suspense>
    </CardShell>
  );
}
