import { route } from '@/lib/bff';
import { auditQuery } from '@/features/audit/schemas/audit';
import { queryAudit } from '@/services/audit';

const istStart = (d: string) => new Date(`${d}T00:00:00+05:30`).toISOString();
const istNextDay = (d: string) =>
  new Date(new Date(`${d}T00:00:00+05:30`).getTime() + 86_400_000).toISOString();

export const GET = route({ permission: 'audit.view', schema: auditQuery }, async ({ body: f }) =>
  queryAudit({
    q: f.q,
    result: f.result,
    actor: f.actor || undefined,
    role: f.role || undefined,
    action: f.action,
    resource: f.resource,
    ip: f.ip,
    fromUtc: f.from ? istStart(f.from) : undefined,
    toUtc: f.to ? istNextDay(f.to) : undefined,
  }),
);
