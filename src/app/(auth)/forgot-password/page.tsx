import { Suspense } from 'react';
import { CardShell } from '@/features/auth/components/AuthShell';
import { ForgotForm } from '@/features/auth/components/ForgotForms';

export const metadata = { title: 'Forgot password' };

export default function Page() {
  return (
    <CardShell>
      <Suspense fallback={null}>
        <ForgotForm />
      </Suspense>
    </CardShell>
  );
}
