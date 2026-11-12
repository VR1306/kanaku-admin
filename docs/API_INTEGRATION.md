# Platform integration

The **Admin Portal is the system of record** for categories, plans, coupons, landing-page content, announcements and support conversations. The User App and Landing Page consume it over HTTP; nothing is shared at the database level (each app has its own MongoDB cluster).

```
 Landing Page ──GET /api/v1/public/landing──────────────┐
                                                        ▼
 User App ──GET /api/v1/public/{categories,plans}──► Admin Portal (Next.js BFF + MongoDB `kanaku_admin`)
     │       ──POST /api/v1/service/* (Bearer SERVICE_API_KEY)──►   ▲   │  POST /api/integrations/admin/notifications
     │                                                              │   └──► User App (in-app notification centre)
     └─ browsers ── Socket.IO ──► Realtime service (realtime/server.ts) ◄── outbox collection ── Admin Portal
```

## API documentation (Swagger / OpenAPI 3.1)

Three separate sets, served by the Admin Portal (`npm run dev` → http://localhost:3001):

| Set              | UI              | JSON               | Covers                                                                                                                                     |
| ---------------- | --------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Admin Portal     | `/docs/admin`   | `/openapi/admin`   | auth, team/roles, users, plans, coupons, payments, categories, landing CMS, announcements, support, audit, notifications, integration (v1) |
| User Application | `/docs/user`    | `/openapi/user`    | auth-adjacent settings, categories (read-only), subscriptions, notifications, support chat, finance, admin integration endpoint            |
| Landing Page     | `/docs/landing` | `/openapi/landing` | content, validation, cache revalidation                                                                                                    |

Each operation lists method, parameters, request/response schemas, auth requirement and status codes (`400/401/403/429` plus endpoint-specific). Request bodies are generated from the same zod schemas the routes validate with. The sources are `src/openapi/*.ts`; when you add a route, add its operation there (a quick audit — route files vs. spec — was used to verify they match 1:1).

## Admin-controlled data

| Data                   | Admin screen                          | Consumed by                                 | How                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ---------------------- | ------------------------------------- | ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Categories             | Categories                            | User App                                    | `GET /api/v1/public/categories` (enabled only). User App `POST/DELETE /api/categories` return `403 managed_by_admin`; users may only set their own monthly budget (`PUT /api/categories/{id}`).                                                                                                                                                                                                                                     |
| Plans & prices         | Plans                                 | User App, Landing                           | `GET /api/v1/public/plans` (price, GST, feature bullets). Checkout totals are computed server-side from these.                                                                                                                                                                                                                                                                                                                      |
| Plan access (modules)  | Plans → **Customer access**           | User App                                    | `modules` and `maxBudgets` on `GET /api/v1/public/plans`. The User App hides menu items, redirects pages to Plan & billing, and returns `403 plan_required` / `plan_limit` from its API for modules a plan doesn't include. Settings and Help are always available. If the admin has never been reachable, access fails open so a paying customer is never locked out.                                                              |
| Coupons                | Coupons                               | User App                                    | `POST /api/v1/service/coupons/validate` (plan-scoped, dates, redemption cap). Redemptions are counted when the User App reports the payment (`/service/payments/record`, idempotent).                                                                                                                                                                                                                                               |
| Landing page           | Website content (+ **Structure** tab) | Landing                                     | `GET /api/v1/public/landing`: published CMS (hero, features, FAQ, pricing, footer, colours) + structure (navigation, steps, CTA, footer links, labels, SEO) + live plan prices. Publishing/plan edits call the landing's `/api/revalidate` so changes show immediately (`LANDING_URL`, `LANDING_REVALIDATE_SECRET`); otherwise within the cache window (minutes). The landing keeps its bundled default only as an outage fallback. |
| Privacy Policy & Terms | Website content → **Legal**           | User App and Landing (`/privacy`, `/terms`) | `GET /api/v1/public/legal/{privacy or terms}`: published version only, drafts stay private. Publishing refreshes the landing cache at once (`landing-legal` tag); the User App updates within a minute and keeps its bundled text only as an outage fallback, so sign-up always links to readable terms.                                                                                                                            |
| Users                  | Users                                 | –                                           | User App mirrors users to `POST /api/v1/service/users/sync` on verification, profile/consent changes and payment. Run `npm run backfill:admin` in the User App once for existing users.                                                                                                                                                                                                                                             |

## Real-time chat & notifications

- **Service:** `realtime/server.ts` (Socket.IO). `npm run realtime` (default port 4100). It cannot run inside Next.js/Vercel serverless — deploy it as a long-lived Node process (Railway/Render/Fly). Env: `REALTIME_SECRET`, `REALTIME_ORIGINS`, `MONGODB_URI/DB`, `ADMIN_URL` + `SERVICE_API_KEY` (so it can tick the announcement scheduler every 30 s).
- **Auth:** each browser gets a 5-minute HMAC token (`REALTIME_SECRET`, shared) from its own app (`/api/realtime/token` in the admin, `/api/realtime/chat-token` in the User App) and re-fetches it on every reconnect. Users join only `user:<id>`; agents (permission `support.manage`) also join `agents`. Typing events are checked against ticket ownership server-side.
- **Delivery:** services write events to the `outbox` collection (TTL 2 min); the service forwards them (change stream + 2 s polling safety net, de-duplicated). After a reconnect clients refetch, so nothing is lost while offline.
- **Chat:** conversations live in the admin's `tickets`. The User App uses `/api/v1/service/support/*` with the signed-in user's id; users only ever see their own conversations and never see internal notes. Message states: ✓ sent → ✓✓ delivered → ✓✓ read. Unread counts, typing indicator and history are included. The admin Support screen polls only as a 30 s safety net (3 s while the socket is down).
- **Admin notifications:** new tickets/messages create `admin_notifications` for the assignee (or all agents) and push `notification:new`; the bell in the console shows the badge, history and mark-as-read.

## Announcements & delivery

Channels: **in-app notification** (also the legacy banner/modal choices), **email**, **mobile push (FCM)**, **SMS**. Publishing queues one delivery per (user × channel) in `deliveries`; a worker sends them:

- in-app → User App `POST /api/integrations/admin/notifications` (stored in its notification centre and pushed over its own socket; `dedupeKey` makes retries safe)
- email → SMTP (`SMTP_*`), push → FCM HTTP v1 (`FIREBASE_SERVICE_ACCOUNT_JSON`), SMS → Twilio (`TWILIO_*`; swap `sms()` in `src/services/channels.ts` for another provider)
- **Consent:** in-app/email honour the user's toggles (Settings → Preferences); push needs a registered device token; **SMS is opt-in only** (`notify.sms === true` and a phone number).
- **Tracking & retries:** records end `sent`, `failed` (4 attempts, back-off 1 / 5 / 30 min) or `skipped` (with a reason such as "no SMS consent" or "Firebase not configured"). Counts appear per announcement in the console. Scheduled announcements are published by `POST /api/v1/service/jobs/tick` (called every 30 s by the realtime service).
- FCM and SMS stay **skipped until credentials are provided**; the User App has no device-token registration yet (it needs a Firebase web/mobile client — send tokens through `users/sync`'s `pushTokens`).

## Security

- Server-to-server calls: `Authorization: Bearer <SERVICE_API_KEY>` (≥ 16 chars, timing-safe compare), identical value in both apps. Public endpoints are read-only and cacheable; CORS via `PUBLIC_API_ORIGINS`.
- Browser → admin: signed HttpOnly SameSite=Strict session, CSRF origin check on writes, per-request server-side permission check (`src/lib/bff.ts`).
- Secrets live in `.env.local` only. Rotate any credential that has been pasted into chat or a ticket.

## Database reset (test environments only)

`node scripts/reset-db.mjs --env <app .env.local> --kind admin|user` is a **dry run** that lists the cluster, database and per-collection counts. To execute: add `--execute --confirm <databaseName>`. It writes a verified backup to `backups/<db>-<time>/` first, empties collections but keeps indexes (and, for the admin, the `admins` and `roles` collections), then re-seeds the admin's starter configuration (plans, categories, landing baseline). It refuses any database or host containing "prod". Restore: `node scripts/restore-db.mjs --env … <backup dir> --confirm <databaseName>`.

## Known gaps

- Attachments in support chat are not carried through the user ↔ admin bridge (text only); the User App's attach button was removed.
- User "usage" figures in the console are empty (the User App owns that data and does not expose it).
- Payments are reported by the User App after a successful capture; refunds issued in the admin are recorded in the admin only (no gateway call).
- Rate limiting and lockout counters are per-process memory; audit retention (2 y + 5 y) is an unconfirmed assumption.
- Pricing: Pro monthly ₹199 + 18% GST; yearly = 12 months less 20% (₹1,910) + GST — all editable in the console now (`plans`).
