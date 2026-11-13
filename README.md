# Kanaku Admin Console

Next.js 16 (App Router, Cache Components) admin console. See `AGENTS.md` — read `node_modules/next/dist/docs/` before changing Next-specific code (e.g. `middleware` is now `proxy`).

## Setup

1. `npm install` (also installs Husky hooks)
2. `cp .env.example .env.local` and set `SESSION_SECRET` (`openssl rand -hex 32`). **Quote values containing `#`.**
3. `npm run seed` creates the first Super Admin (from `SEED_ADMIN_*`) plus the starter Free/Pro plans and default categories (add `-- --demo` for sample users/payments). Then `npm run dev` → http://localhost:3001 and sign in; you're asked to change the password and enrol an authenticator app on first login.

## Run the whole platform locally

| App                           | Command                                                                                                                                                                       | Port     |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| Landing (`kanaku-landing-fe`) | `npm run dev` (fixed to 3000) with `LANDING_API_URL=http://localhost:3001/api/v1/public`                                                                                      | **3000** |
| Admin Portal                  | `npm run dev` (fixed to 3001)                                                                                                                                                 | **3001** |
| Admin realtime (Socket.IO)    | `npm run realtime`                                                                                                                                                            | 4100     |
| User App (`kanaku-user-fe`)   | `npm run dev` (fixed to 3002; also starts its own realtime on 4000) with `ADMIN_API_URL=http://localhost:3001`, `NEXT_APP_URL=http://localhost:3002`, `NEXT_API_URL=` (empty) | **3002** |

Shared secrets (same value in each app's `.env.local`): `SERVICE_API_KEY`, `REALTIME_SECRET`. In the admin also set `USER_APP_URL=http://localhost:3002`, `LANDING_URL=http://localhost:3000`, `LANDING_REVALIDATE_SECRET` (= the landing's `REVALIDATE_SECRET`). **Swagger:** http://localhost:3001/docs/admin · `/docs/user` · `/docs/landing`. Full details: `docs/API_INTEGRATION.md`.

**Deploying:** see `docs/DEPLOYMENT.md` (live URLs, per-app environment variables, the realtime services, and a post-deploy checklist).

## Architecture

`src/app` routing + `app/api` BFF handlers only · `src/features/<domain>` components/schemas · `src/components/ui` shared UI · `src/services` data layer (**MongoDB**, via `src/lib/db.ts`) · `src/lib` session/BFF/permissions.
Browser code only calls `/api/*`. Every handler uses `route()` (`src/lib/bff.ts`): CSRF origin check, session + server-side permission (401/403), zod validation, rate limit, request id, audit hook.

## Quality gates

Pre-commit: lint-staged (Prettier + ESLint), `typecheck`, `check:length`. Pre-push: lint, typecheck, length, build. 500-line limit is enforced by `scripts/check-file-length.mjs` and ESLint `max-lines`.

## Status

**Built:** auth (sign-in, MFA with TOTP + backup codes + email-OTP fallback, forgot/reset password, invite acceptance, first-time password + MFA setup, lockouts, idle timeout with 2-minute warning, device sessions with revoke, light/dark theme) · dashboard (ranges incl. custom, recent activity) · users (list/filters/tabs, add + invite, detail, reset password, change plan, disable/suspend/reinstate, resend invite, CSV export, send announcement) · plans/payments/coupons · default categories · landing-page CMS (+ theme, rich FAQ, drag-and-drop, hero image, versions) · announcements (scheduling, audience, channels, image + crop, status lifecycle) · support (real-time chat over Socket.IO with unread counts, typing and ✓/✓✓ receipts, internal notes, SLA, auto-assignment, canned replies) · notifications bell · Swagger docs (`/docs/*`) · integration API (`/api/v1`) · team & roles (members, invites, permission matrix, custom roles, confirmations) · audit (filters, details, CSV export, Super-Admin security alerts).
**UI parity with the user app:** tokens, light/dark theme (pre-paint script), Framer Motion (collapsible sidebar with `layoutId` active pill, mobile drawer, page transitions, dialog/button springs, count-up and staggered reveals), 54px inputs / 52px selects / cyan focus ring / shaking errors / show-hide password, favicon set, profile page (details, photo, password, sessions, theme) and logout (sidebar + profile).
**UI system (shared, in `src/components/ui/`):** `Modal` (right drawer for add/edit forms, centred dialog for confirmations/action details; CSS enter/exit animations, backdrop fade, focus trap, scroll lock, reduced-motion safe), `DataTable` (sticky header, select-all with indeterminate state, loading skeleton / empty / error + retry / refreshing states, scroll inside the container), `ActionMenu` (portal, animated, keyboard navigable), `SegmentedControl` / `PillTabs` (sliding indicator) + `FadeSwitch` (tab panel cross-fade without layout shift), `Button` (spinner, blocks double submits), route-level `loading.tsx` skeleton. Website Content preview is a full-screen laptop/tablet/phone preview of the live draft. Support is inbox | conversation | details with a list→conversation flow on phones.
**Interaction patterns:** every add/edit form is a right-hand drawer (`Modal variant="drawer"`); confirmations are small dialogs; every table uses `DataTable` with labelled headers, a select-all checkbox column where rows are selectable, and an "Actions" column with a keyboard-accessible `ActionMenu`.
**Tests:** `npm test` (Vitest, security-critical logic). **Gates:** `npm run lint && npm run typecheck && npm run check:length && npm run build`.

See `docs/API_INTEGRATION.md` (mocks, pending contracts, known gaps) and `docs/CMS.md`.

**Pricing is confirmed:** Pro monthly ₹199 + 18% GST; yearly = 12 months less 20% (₹1,910) + GST. See `src/utils/pricing.ts`.

## Mocks & open decisions

All data is stored in MongoDB (`MONGODB_URI`, `MONGODB_DB`). Email (SMTP), in-app, chat and notifications are live; **FCM push and SMS are built but inactive until credentials are set**; the payment gateway lives in the User App (Razorpay) and reports payments here. CTA limit, inactivity rule, Coupon Creator scope, support hours, audit retention and the `@kanaku.com` allow-list are unconfirmed; the email allow-list is env-configurable.
