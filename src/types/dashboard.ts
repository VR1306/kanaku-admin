export interface DashboardData {
  range: string;
  mrr: {
    vsLabel: string;
    value: number;
    changePct: number;
    payingUsers: number;
    conversionPct: number;
    refunds30d: number;
  };
  users: { active: number; total: number; newSignups: number; invitedIncomplete: number };
  monthly: Array<{ month: string; signups: number; conversions: number }>;
  byPlanStatus: Array<{ label: string; value: number }>;
  recent: Array<{
    name: string;
    kind: 'payment' | 'signup' | 'failed' | 'upgrade' | 'refund';
    detail: string;
    /** Amount charged/refunded incl. GST (payments, upgrades, refunds). */
    amount?: number;
    at: string;
  }>;
  actions: {
    openTickets: number;
    slaBreaches: number;
    avgFirstReplyMin: number | null;
    failedPayments: number;
    pendingInvites: number;
    nextInvite: { email: string; role: string; expiresInDays: number } | null;
  };
}
