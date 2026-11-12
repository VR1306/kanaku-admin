import { route } from '@/lib/bff';
import { dashboardQuery } from '@/features/dashboard/schemas';
import { getDashboard } from '@/services/reporting';

export const GET = route(
  { permission: 'dashboard.view', schema: dashboardQuery },
  async ({ body }) => getDashboard(body.range, body.from, body.to),
);
