import { redirect } from 'next/navigation';

// Sessions moved into Profile → Security.
export default function Page() {
  redirect('/profile');
}
