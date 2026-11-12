export type AnnStatus = 'draft' | 'scheduled' | 'live' | 'expired';
export type Audience = 'all' | 'starter' | 'pro' | 'inactive30' | 'custom';
export type Channel = 'inapp' | 'banner' | 'modal' | 'email' | 'push' | 'sms';

export interface Announcement {
  id: string;
  title: string;
  message: string;
  ctaLabel: string;
  ctaHref: string;
  image: { dataUrl: string; alt: string; name: string; size: number } | null;
  audience: Audience;
  customUserIds: string[];
  channels: Channel[];
  sendNow: boolean;
  publishAt: string | null; // ISO UTC
  expiresAt: string | null;
  trigger: 'next_login' | 'dashboard' | 'page' | 'inactivity';
  triggerValue: string; // page path or N days
  frequency: 'once' | 'session' | 'until_dismissed';
  draft: boolean;
  createdAt: string;
  openRatePct: number | null;
}
export interface DeliveryCounts {
  pending: number;
  sent: number;
  failed: number;
  skipped: number;
  byChannel: Record<string, Omit<DeliveryCounts, 'byChannel'>>;
}
export interface AnnouncementRow extends Announcement {
  status: AnnStatus;
  reach: number;
  /** Delivery tracking across channels; null until the announcement has been published. */
  delivery: DeliveryCounts | null;
}

export const AUDIENCE_LABEL: Record<Audience, string> = {
  all: 'All users',
  starter: 'Starter',
  pro: 'Pro',
  inactive30: 'Inactive 30+ days',
  custom: 'Custom segment',
};
export const CHANNEL_LABEL: Record<Channel, string> = {
  inapp: 'In-app notification',
  banner: 'In-app banner',
  modal: 'In-app modal',
  email: 'Email',
  push: 'Mobile push',
  sms: 'SMS',
};
