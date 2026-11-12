import { Suspense } from 'react';
import { connection } from 'next/server';
import { LandingPage } from '@/features/cms/components/LandingPage';
import { listPlans } from '@/services/billing';
import { getPublished } from '@/services/content';

// Public landing page: renders the *published* CMS version only (never the draft).
async function Site() {
  await connection(); // always read the latest published version
  const cfg = await getPublished();
  if (!cfg) return <p className="p-8">Site not published yet.</p>;
  return <LandingPage config={cfg} plans={await listPlans()} />;
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <Site />
    </Suspense>
  );
}
