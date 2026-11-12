import { route } from '@/lib/bff';
import { listAudit } from '@/services/audit';

const esc = (v: unknown) =>
  `"${String(v ?? '')
    .replace(/"/g, '""')
    .replace(/^([=+\-@])/, "'$1")}"`;

// Exports are themselves audited (before the data is read, so the export appears in the log).
export const GET = route({ permission: 'audit.view' }, async ({ audit }) => {
  await audit('Exported audit log (CSV)', 'Audit log');
  const rows = (await listAudit()).map((e) =>
    [e.at, e.actor, e.actorRole, e.action, e.resource, e.ip, e.result, e.requestId]
      .map(esc)
      .join(','),
  );
  return { csv: ['time_utc,actor,role,action,resource,ip,result,request_id', ...rows].join('\n') };
});
