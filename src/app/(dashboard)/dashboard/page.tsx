import { PageGuard } from '@/lib/PageGuard';
import { DashboardView } from '@/features/dashboard/components/DashboardView';

export const metadata = { title: 'Dashboard' };

const IST = 'Asia/Kolkata';

// Runs inside PageGuard after the session is read (request time), so the clock is safe to use here.
function header() {
  const now = new Date();
  const hour = Number(
    new Intl.DateTimeFormat('en-GB', { timeZone: IST, hour: 'numeric', hour12: false }).format(now),
  );
  return {
    greeting: hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening',
    dateLabel: new Intl.DateTimeFormat('en-GB', {
      timeZone: IST,
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    })
      .format(now)
      .toUpperCase(),
  };
}

export default function DashboardPage() {
  return (
    <PageGuard permission="dashboard.view">
      {({ can, name }) => (
        <DashboardView
          name={name}
          {...header()}
          links={{
            support: can('support.manage'),
            payments: can('payments.view'),
            team: can('team.manage'),
            users: can('users.view'),
          }}
        />
      )}
    </PageGuard>
  );
}
