export interface Category {
  id: string;
  name: string;
  users: number;
  enabled: boolean;
  color: CategoryColor;
  kind: CategoryKind;
  icon: CategoryIcon;
  description: string;
  /** Seeded starter categories can be disabled but not deleted. */
  builtin: boolean;
}

export const CATEGORY_COLORS = [
  'cyan',
  'blue',
  'rose',
  'green',
  'violet',
  'amber',
  'slate',
] as const;
export type CategoryColor = (typeof CATEGORY_COLORS)[number];
export const CATEGORY_KINDS = ['expense', 'income'] as const;
export type CategoryKind = (typeof CATEGORY_KINDS)[number];
export const CATEGORY_ICONS = [
  'food',
  'home',
  'car',
  'bag',
  'bolt',
  'heart',
  'film',
  'book',
  'plane',
  'gift',
  'trend',
  'paw',
  'tag',
  'wallet',
  'coffee',
  'payments',
] as const;
export type CategoryIcon = (typeof CATEGORY_ICONS)[number];

export type PaymentStatus = 'paid' | 'failed' | 'refunded';
export interface Payment {
  id: string;
  user: string;
  plan: string;
  amount: number;
  method: string;
  at: string;
  status: PaymentStatus;
}

export interface Plan {
  id: string;
  name: string;
  description: string;
  badge: string;
  visible: boolean;
  monthly: number | null;
  gstPct: number;
  gstMode: 'exclusive' | 'inclusive';
  yearly: number | null;
  subscribers: number;
  version: number;
  status: 'live' | 'archived';
  /** User App modules this plan includes (see constants/user-modules). */
  modules?: string[];
  /** Most budgets a customer on this plan can have; null = unlimited. */
  maxBudgets?: number | null;
}

export interface Coupon {
  id: string;
  code: string;
  type: 'percent' | 'fixed';
  value: number;
  plans: string[];
  duration: 'once' | 'first3' | 'first12' | 'forever';
  from: string;
  until: string;
  maxRedemptions: number | null;
  perUser: number;
  redeemed: number;
  active: boolean;
  /** Shown to users in the checkout's "Available offers" list (the default). Unlisted coupons only work when typed in. */
  listed?: boolean;
  archived?: boolean;
}
