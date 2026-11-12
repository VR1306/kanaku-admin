export const PERMISSIONS = [
  'dashboard.view',
  'users.view',
  'users.write',
  'users.suspend',
  'users.resetPassword',
  'users.changePlan',
  'users.export',
  'payments.view',
  'payments.refund',
  'coupons.write',
  'plans.write',
  'categories.write',
  'cms.write',
  'announcements.write',
  'support.manage',
  'audit.view',
  'team.manage',
] as const;

export type Permission = (typeof PERMISSIONS)[number];
/** Role ids are strings so custom roles can exist. Built-ins: super_admin, admin, analyst, chat_support, coupon_creator. */
export type RoleId = string;

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: RoleId;
}

/** Stage 'mfa' = password verified, second factor pending. 'setup' = must finish first-login setup. */
export interface SessionPayload extends SessionUser {
  stage: 'mfa' | 'setup' | 'active';
  rem?: boolean; // 'keep me signed in': persistent cookie (still capped by the 8h absolute limit)
  sid: string; // session id, used for per-device listing/revocation
  iat: number;
  exp: number; // hard 8h absolute expiry (s)
  seen: number; // last activity (s) — 30 min idle timeout
}
