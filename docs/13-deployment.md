# Vero deployment and operations

## Targets

- Heroku app: `vero-app`, Node 24, NestJS API under `/api` and Expo SDK 58 server-rendered web on the same origin.
- Canonical URL: https://vero-backend.cloudplay.tech. The default Heroku web hostname redirects public pages here.
- PostgreSQL: existing Supabase `vero` project, `bujsevlqmsxhkbvvbtvs`, session pooler `aws-1-eu-west-1.pooler.supabase.com:5432`.
- Separate backend database login `vero_backend`; it owns the Vero tables. No Supabase Auth or client database access is used. RLS and revoked direct-client grants protect application tables; NestJS implements user authorization.
- Private Supabase Storage bucket `vero-reviews`. The server key stays in Heroku. Every public photo request checks current review/shop visibility; no public bucket or long-lived public object URL is used.

## Build and release

Run `npm ci` at the repository root, then `npm run heroku-postbuild`. The build installs backend with its pnpm lockfile, generates Prisma, builds NestJS, installs frontend with its npm lockfile and exports Expo web. Backend development dependencies remain available for the release migration command.

`Procfile` runs `prisma migrate deploy` in the release phase before starting the web process. The four forward migrations retain historical CloudOps data in `legacy_cloudops`, introduce Vero, and enable RLS. Never run `db:reset`, `migrate reset` or the development seed in production. Do not rewrite applied migrations.

Required Heroku variables: `DATABASE_URL`, `JWT_SECRET`, `NODE_ENV=production`, `SERVE_WEB=true`, `CORS_ORIGIN`, `PUBLIC_WEB_URL`, `EXPO_PUBLIC_API_URL`, `EXPO_PUBLIC_WEB_URL`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `MEDIA_BUCKET`, and configured Google public client IDs. Changing an EXPO_PUBLIC variable requires rebuilding web/native bundles.

The database URL uses `sslmode=verify-full` and `sslrootcert=/app/backend/certs/supabase-ca.crt`. The committed file is a **public CA certificate**, not a private key. Source: https://supabase-downloads.s3-ap-southeast-1.amazonaws.com/prod/ssl/prod-ca-2021.crt. SHA-256 fingerprint: `80:70:25:AD:50:D4:ED:21:9D:2C:9C:7D:29:9C:00:4F:82:4E:B0:0C:F7:F6:5A:FE:F6:07:D0:7B:72:E6:CA:FA`. Pooler authentication, CA verification and hostname verification were tested locally. Runtime pool maximum is five connections per process.

## Authentication setup

Google web and Android IDs were imported without copying the supplied web client secret. Android package: `com.vero.app`. The user confirmed the canonical HTTPS origin was added in Google Cloud. Native Google requires the installed APK's signing SHA-1 to match its Android OAuth client. Live account/device verification remains separate. iOS Google stays disabled by request; email/password remains available.

Production password recovery remains disabled until `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `MAIL_FROM` and any provider credentials are configured. Set `PASSWORD_RESET_URL` to the canonical `/reset-password` page. Local Mailpit verifies recovery without sending external messages.

An explicit one-time admin script is available at `backend/scripts/provision-admin.cjs`, requiring `BOOTSTRAP_ADMIN_EMAIL` and a strong `BOOTSTRAP_ADMIN_PASSWORD`. It never logs credentials, never creates demo reviews, and does not reset an existing account's password. Remove bootstrap config variables after use. The selected admin is `wassimbenazzoun.tn@gmail.com`; its temporary password is delivered in an ignored local file, never in Git or chat.

## Verification and recovery

Backend: `pnpm build`, `pnpm lint`, `pnpm test -- --runInBand`, `pnpm exec prisma validate`. For isolated integration/migration/backup tests set `TEST_DATABASE_ADMIN_URL` to the **local Docker** maintenance database and run `pnpm test:e2e`; it creates and removes only random test databases. Docker PostgreSQL and S3Mock must be running.

Frontend: `npm run typecheck`, `npm run lint`, and Expo agent CLI exports for web/Android/iOS. Real browser checks cover cookie restore, local password recovery, draft retention, shop creation, photos, review editing/deletion, moderation, RTL and server-rendered content. Android/iOS bundle export does not prove physical-device behavior.

The integration suite exercises a real Docker `pg_dump`/`pg_restore` round trip and compares users, reviews, reports and audit records. For production, retain encrypted off-machine backups of PostgreSQL **and private objects**, test restoration into a separate environment, and confirm the Supabase plan's backup retention before a public pilot. A database dump alone does not back up image bytes.

Monitor `/api/health` and Heroku process/error logs. Request logs include route, HTTP status and duration; omit query strings, bodies and credentials. Review failure rates for auth/upload/publication and report resolution age during the pilot. No third-party analytics or error-monitoring subscription has been purchased.

HTML and loader responses use `no-store`. `/sitemap.xml` contains only visible shops/reviews, capped at 50,000 URLs for the pilot. Static assets may be cached for one hour. Do not cache public evidence independently of moderation state.

## Native distribution

EAS project `@wassimba/vero`, ID `7052daca-cac9-47e6-b927-f9642ff71d2c`. Preview builds produce an internal Android APK against the canonical API. Production profile prepares an Android AAB; no Play Store submission is configured. Existing EAS-managed signing credentials are reused. Upload exclusions were inspected; private environment and signing files are excluded. No Apple membership/iOS signing or store publication is configured.

APK build started from `288cf05`: https://expo.dev/accounts/wassimba/projects/vero/builds/25a148d8-f804-4e9c-addf-a7c99b29d675. Record its final status and artifact after completion; a queued build is not a verified APK.
