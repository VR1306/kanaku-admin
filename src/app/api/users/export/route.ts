import { route } from '@/lib/bff';
import { exportBody } from '@/features/users/schemas/users';
import { getUsers, listUsers } from '@/services/users';
import { PLAN_LABEL } from '@/types/users';

// Neutralise spreadsheet formula injection (=,+,-,@) and quote fields.
const esc = (v: unknown) =>
  `"${String(v ?? '')
    .replace(/"/g, '""')
    .replace(/^([=+\-@\t\r])/, "'$1")}"`;

export const GET = route(
  { permission: 'users.export', schema: exportBody, rateLimit: 10 },
  async ({ body, audit }) => {
    const ids = body.ids?.split(',').filter(Boolean);
    const rows = ids?.length
      ? await getUsers(ids)
      : (await listUsers({ page: 1, pageSize: 5000 })).items;
    await audit('Exported users (CSV)', 'Users', {
      after: { count: rows.length, selected: !!ids?.length },
    });
    return {
      csv: [
        'id,name,email,plan,status,joined',
        ...rows.map((u) =>
          [u.id, u.name, u.email, PLAN_LABEL[u.plan], u.status, u.joined].map(esc).join(','),
        ),
      ].join('\n'),
      count: rows.length,
    };
  },
);
