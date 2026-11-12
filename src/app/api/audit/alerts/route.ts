import { route, HttpError } from '@/lib/bff';
import { securityAlerts } from '@/services/audit';

// Security alerts are for Super Admins only.
export const GET = route({ permission: 'audit.view' }, async ({ session }) => {
  if (session!.role !== 'super_admin')
    throw new HttpError(403, 'Security alerts are visible to Super Admins only', 'forbidden');
  return securityAlerts();
});
