import { Suspense } from 'react';
import { PageGuard } from '@/lib/PageGuard';
import { AnnouncementsView } from '@/features/announcements/components/AnnouncementsView';

export default function Page() {
  return (
    <PageGuard permission="announcements.write">
      {() => (
        <Suspense fallback={null}>
          <AnnouncementsView />
        </Suspense>
      )}
    </PageGuard>
  );
}
