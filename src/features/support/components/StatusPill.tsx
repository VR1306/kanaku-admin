import { Badge, type Tone } from '@/components/ui/Badge';
import type { TicketStatus } from '@/types/support';

/** The customer-facing status (what the user sees in the app): Open · Pending (waiting on them) · Resolved. */
const MAP: Record<TicketStatus, { label: string; tone: Tone }> = {
  open: { label: 'Open', tone: 'blue' },
  assigned: { label: 'Open', tone: 'blue' },
  waiting: { label: 'Pending', tone: 'amber' },
  resolved: { label: 'Resolved', tone: 'green' },
  closed: { label: 'Resolved', tone: 'green' },
};

export const StatusPill = ({ status }: { status: TicketStatus }) => (
  <Badge tone={MAP[status].tone}>{MAP[status].label}</Badge>
);
