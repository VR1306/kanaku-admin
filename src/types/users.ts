export type UserStatus = 'invited' | 'active' | 'inactive' | 'suspended';
export type PlanId = 'starter' | 'pro_monthly' | 'pro_yearly';

export interface AppUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  plan: PlanId;
  status: UserStatus;
  lastActive: string;
  joined: string;
  renewsOn: string | null;
  mfa: boolean;
  location: string;
  lastPasswordChange: string | null;
  /** Notification consent captured in the User App (announcements respect it). */
  notify?: { inApp: boolean; email: boolean; push: boolean; sms: boolean };
  /** FCM registration tokens of the user's devices. */
  pushTokens?: string[];
}

export interface UserPage {
  items: AppUser[];
  total: number;
  counts: Record<UserStatus | 'all', number>;
}

export interface UserDetail extends AppUser {
  usage: { transactions: number; budgets: number; recurring: number; receipts: string } | null;
  activity: Array<{ title: string; detail: string; at: string }>;
  invoices: Array<{ id: string; date: string; status: 'paid' | 'failed' }>;
  sessions: string[];
}

export const PLAN_LABEL: Record<PlanId, string> = {
  starter: 'Starter',
  pro_monthly: 'Pro monthly',
  pro_yearly: 'Pro yearly',
};
export const PLAN_RANK: Record<PlanId, number> = { starter: 0, pro_monthly: 1, pro_yearly: 2 };
