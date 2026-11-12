import { AuthShell } from '@/features/auth/components/AuthShell';
import { LoginForm } from '@/features/auth/components/LoginForm';

export const metadata = { title: 'Log in' };

export default function LoginPage() {
  return (
    <AuthShell
      headline="Run the platform"
      accent="with confidence."
      blurb="Users, plans, payments, content and support in one place. Every action is permission-checked and recorded in the audit log."
    >
      <LoginForm />
    </AuthShell>
  );
}
