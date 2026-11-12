import { Suspense } from 'react';
import { CardShell } from '@/features/auth/components/AuthShell';
import { ForgotSent } from '@/features/auth/components/ForgotForms';

export const metadata = { title: 'Check your inbox' };

export default function Page() {
  return (
    <CardShell>
      <Suspense fallback={null}>
        <ForgotSent />
      </Suspense>
    </CardShell>
  );
}
