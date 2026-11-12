export type TicketStatus = 'open' | 'assigned' | 'waiting' | 'resolved' | 'closed';
export type Priority = 'low' | 'medium' | 'high';

export interface Attachment {
  name: string;
  size: number;
  type: string;
}
export interface Message {
  id: string;
  from: 'user' | 'agent' | 'system';
  internal: boolean; // internal notes never leave the admin console
  body: string;
  at: string;
  author: string;
  /** Delivery receipts: set when the other party's client received / opened it. */
  deliveredAt?: string;
  readAt?: string;
  attachments?: Attachment[];
}
export interface Ticket {
  id: string; // #1042
  subject: string;
  topic: string;
  user: { id: string; name: string; plan: string };
  status: TicketStatus;
  priority: Priority;
  assignee: string | null; // admin member id
  assigneeName: string | null;
  createdAt: string;
  firstResponseAt: string | null;
  resolvedAt: string | null;
  rating: number | null;
  messages: Message[];
  typing?: { who: 'user' | 'agent'; until: number };
}
export const STATUS_LABEL: Record<TicketStatus, string> = {
  open: 'Open',
  assigned: 'Assigned',
  waiting: 'Waiting on user',
  resolved: 'Resolved',
  closed: 'Closed',
};
export const SLA_FIRST_RESPONSE_MS = 4 * 3600_000;
