import { Suspense } from 'react';
import { CardShell } from '@/features/auth/components/AuthShell';
import { ResetForm } from '@/features/auth/components/ForgotForms';

export const metadata = { title: 'Reset password' };

export default function Page() {
  return (
    <CardShell>
      <Suspense fallback={null}>
        <ResetForm />
      </Suspense>
    </CardShell>
  );
}
