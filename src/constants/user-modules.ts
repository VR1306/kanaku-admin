/**
 * The User App's modules a plan can include. Keys are shared with the User App (`constants/modules.ts` there).
 * Settings and Help & support are always available to every plan, so a customer can always upgrade or get help.
 */
export const USER_MODULES = [
  { key: 'dashboard', label: 'Dashboard', hint: 'Overview of spending and budgets' },
  { key: 'transactions', label: 'Transactions', hint: 'Record and browse income and expenses' },
  { key: 'budgets', label: 'Budgets', hint: 'Monthly limits per category' },
  { key: 'reports', label: 'Reports', hint: 'Trends and category breakdowns' },
  {
    key: 'recurring',
    label: 'Recurring payments',
    hint: 'Rent, subscriptions and salary on a schedule',
  },
  { key: 'categories', label: 'Categories', hint: 'Browse categories and set budgets' },
  { key: 'notifications', label: 'Notifications', hint: 'Alerts, announcements and reminders' },
  { key: 'exports', label: 'Exports', hint: 'Download transactions and reports (Excel/CSV)' },
] as const;
export type UserModule = (typeof USER_MODULES)[number]['key'];
export const USER_MODULE_KEYS = USER_MODULES.map((m) => m.key) as [UserModule, ...UserModule[]];

/** Starting access when a plan has none configured yet: Starter is the free tier, everything else gets all modules. */
export const defaultModulesFor = (planId: string): UserModule[] =>
  planId === 'plan_starter'
    ? USER_MODULE_KEYS.filter((k) => k !== 'recurring' && k !== 'exports')
    : [...USER_MODULE_KEYS];
export const defaultMaxBudgetsFor = (planId: string): number | null =>
  planId === 'plan_starter' ? 5 : null;
