'use client';

import { Select } from '@/components/ui/Field';
import type { Priority, TicketStatus } from '@/types/support';
import type { Detail, TicketList } from './supportTypes';

/** Assignee + priority controls. In the conversation header from `sm` up; in the details drawer on phones. */
export function TicketManage({
  t,
  agents,
  onPatch,
}: {
  t: Detail;
  agents: TicketList['agents'];
  onPatch: (
    b: { status?: TicketStatus; priority?: Priority; assignee?: string | null },
    ok: string,
  ) => void;
}) {
  return (
    <section className="space-y-3 sm:hidden">
      <h3 className="text-xs font-bold tracking-[0.1em] text-muted uppercase">Manage</h3>
      <Select
        aria-label="Assignee"
        value={t.assignee ?? ''}
        onChange={(e) => onPatch({ assignee: e.target.value || null }, 'Assignment updated')}
        options={[
          { value: '', label: 'Unassigned (queued)' },
          ...agents.map((a) => ({
            value: a.id,
            label: `${a.name}${a.online ? '' : ' (offline)'} · ${a.open}`,
          })),
        ]}
      />
      <Select
        aria-label="Priority"
        value={t.priority}
        onChange={(e) => onPatch({ priority: e.target.value as Priority }, 'Priority updated')}
        options={['high', 'medium', 'low'].map((p) => ({
          value: p,
          label: `${p[0].toUpperCase()}${p.slice(1)} priority`,
        }))}
      />
    </section>
  );
}
