# Production deployment

| App                           | Live URL                               | Host                   |
| ----------------------------- | -------------------------------------- | ---------------------- |
| Admin Portal (`kanaku-admin`) | https://admin-kanaku.vercel.app        | Vercel                 |
| User App (`kanaku-user-fe`)   | https://growwithkanaku-user.vercel.app | Vercel                 |
| Landing (`kanaku-landing-fe`) | https://growwithkanaku.vercel.app      | Vercel                 |
| Realtime services (Socket.IO) | _(not on Vercel — see below)_          | Railway / Render / Fly |

**Use new secrets in production.** The values in a local `.env.local` (database password, SMTP app password, `SESSION_SECRET`,
`SERVICE_API_KEY`, `REALTIME_SECRET`, `LANDING_REVALIDATE_SECRET`, the seed password) have been shared in chat and typed into
local files: rotate them, generate fresh ones for Vercel (`openssl rand -hex 32`) and use a **separate production database**
(`MONGODB_DB=kanaku_admin_prod`), not the one you test against.

## 1. Admin Portal — Vercel env vars

| Variable                                                                  | Production value                                                                         |
| ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `SESSION_SECRET`                                                          | new 64-hex string                                                                        |
| `MONGODB_URI`, `MONGODB_DB`                                               | production cluster / database                                                            |
| `SMTP_HOST` `SMTP_PORT` `SMTP_SECURE` `SMTP_USER` `SMTP_PASS` `MAIL_FROM` | your SMTP (rotate the app password)                                                      |
| `USER_APP_URL`                                                            | `https://growwithkanaku-user.vercel.app`                                                 |
| `LANDING_URL`                                                             | `https://growwithkanaku.vercel.app`                                                      |
| `LANDING_REVALIDATE_SECRET`                                               | new secret = the landing's `REVALIDATE_SECRET`                                           |
| `SERVICE_API_KEY`                                                         | new secret = the same value in the User App                                              |
| `REALTIME_SECRET`                                                         | new secret = the same value in the User App and the realtime service                     |
| `NEXT_PUBLIC_REALTIME_URL`                                                | public URL of the admin realtime service (e.g. `https://kanaku-realtime.up.railway.app`) |
| `PUBLIC_API_ORIGINS`                                                      | `https://growwithkanaku.vercel.app,https://growwithkanaku-user.vercel.app`               |
| `SEED_ADMIN_EMAIL` `SEED_ADMIN_NAME` `SEED_ADMIN_PASSWORD`                | only for the first `npm run seed`; remove afterwards                                     |
| _Do not set_ `DEV_ECHO_CODES`                                             | (it is ignored in production anyway)                                                     |

First deploy: run `npm run seed` once against the production database (creates the Super Admin, plans, categories, landing
content and the legal documents), sign in, and you will be asked to change the password and enrol an authenticator.

## 2. User App — Vercel env vars

| Variable                                                            | Production value                                                                     |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| `ADMIN_API_URL`                                                     | `https://admin-kanaku.vercel.app`                                                    |
| `SERVICE_API_KEY`                                                   | same as the admin                                                                    |
| `REALTIME_SECRET`                                                   | same as the admin                                                                    |
| `NEXT_PUBLIC_CHAT_URL`                                              | public URL of the **admin** realtime service (support chat)                          |
| `NEXT_PUBLIC_REALTIME_URL`                                          | public URL of the **User App's** realtime server (notifications)                     |
| `NEXT_APP_URL`                                                      | `https://growwithkanaku-user.vercel.app`                                             |
| `NEXT_API_URL`                                                      | _empty_ (the API is on the same site)                                                |
| `APP_ORIGIN`                                                        | `https://growwithkanaku-user.vercel.app`                                             |
| `SUPPORT_EMAIL`                                                     | your support address (shown in the legal pages)                                      |
| plus the existing `MONGODB_*`, `SESSION_SECRET`, SMTP, `RAZORPAY_*` | production values (switch Razorpay to **live** keys and enable UPI in its dashboard) |

Run `npm run backfill:admin` once so existing users appear in the admin.

## 3. Landing — Vercel env vars

| Variable                                     | Production value                                             |
| -------------------------------------------- | ------------------------------------------------------------ |
| `LANDING_API_URL`                            | `https://admin-kanaku.vercel.app/api/v1/public`              |
| `REVALIDATE_SECRET`                          | same as the admin's `LANDING_REVALIDATE_SECRET`              |
| `NEXT_PUBLIC_SITE_URL`                       | `https://growwithkanaku.vercel.app`                          |
| `USER_APP_LOGIN_URL` / `USER_APP_SIGNUP_URL` | `https://growwithkanaku-user.vercel.app/login` and `/signup` |

## 4. Realtime services (cannot run on Vercel)

Vercel functions cannot hold WebSocket connections. Deploy two small Node services on Railway, Render or Fly:

- **Admin realtime** (`kanaku-admin`, start command `npm run realtime`): support chat + the admin's notification bell + the announcement scheduler.
  Env: `REALTIME_SECRET`, `MONGODB_URI`, `MONGODB_DB`, `REALTIME_PORT` (the platform's `PORT`), `REALTIME_ORIGINS=https://admin-kanaku.vercel.app,https://growwithkanaku-user.vercel.app`,
  `ADMIN_URL=https://admin-kanaku.vercel.app`, `SERVICE_API_KEY`.
- **User App realtime** (`kanaku-user-fe`, start command `npm run realtime:start`): live notification pop-ups. Env: its `MONGODB_*`, `SESSION_SECRET`, `APP_ORIGIN=https://growwithkanaku-user.vercel.app`.

Use `wss`/HTTPS URLs for `NEXT_PUBLIC_REALTIME_URL` and `NEXT_PUBLIC_CHAT_URL`.
**Until these services exist, leave those variables unset** (don't paste a placeholder): the admin Support screen then refreshes every few seconds instead of live, and the User App simply skips the live connection. Nothing breaks.
Scheduled announcements are published by the admin realtime service calling `POST {ADMIN_URL}/api/v1/service/jobs/tick` every 30 s.
If you don't run it, trigger that URL from any scheduler (`Authorization: Bearer <SERVICE_API_KEY>`). Vercel Cron on the Hobby plan only allows daily runs.

## 5. Checklist after deploying

1. `https://admin-kanaku.vercel.app/openapi/admin` loads; `https://admin-kanaku.vercel.app/api/v1/public/plans` returns the plans.
2. The landing page shows the admin's content (edit and publish the hero; it updates within seconds).
3. Sign up in the User App → the user appears in the admin Users list.
4. Send a support message → it shows in the admin Support list and the bell.
5. Publish an announcement → it appears in the user's notifications (and the email arrives).
6. A test coupon applies once per customer.

## Temporary test admin (no MFA)

For first-time testing only. `npm run seed:prod` (reads `.env.vercel`, no shell sourcing) can also create a **test Super Admin** when
`SEED_TEST_ADMIN_EMAIL` and `SEED_TEST_ADMIN_PASSWORD` are set. It signs in without MFA **only while** the admin project has
`ALLOW_MFA_EXEMPT=true`, and **only until its expiry** (`SEED_TEST_ADMIN_DAYS`, default 2, maximum 7). After that the account cannot
sign in at all. Without the switch it behaves like any new admin (MFA setup is required). To finish: invite your real admin in
Team & roles, delete the test account, remove `ALLOW_MFA_EXEMPT` from Vercel and redeploy.
