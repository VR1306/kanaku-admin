import type { Ticket } from '@/types/support';

export type Row = Omit<Ticket, 'messages'> & {
  last: string;
  lastAt: string;
  lastFrom: 'user' | 'agent' | 'system';
  unread: number;
  sla: boolean;
  ageH: number;
};
export interface TicketList {
  items: Row[];
  counts: { mine: number; unassigned: number; open: number };
  agents: Array<{ id: string; name: string; online: boolean; open: number }>;
  quickReplies: string[];
}
export type Detail = Ticket & { userTyping: boolean; sla: boolean };

export const relTime = (hours: number) =>
  hours < 1 ? 'now' : hours < 24 ? `${hours}h` : `${Math.floor(hours / 24)}d`;
