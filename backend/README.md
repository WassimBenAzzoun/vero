# Vero backend

NestJS REST API with Prisma 7 and PostgreSQL 16. Task 03 provides the Vero schema, module boundaries and existing email/password auth with USER/ADMIN permissions. Google sign-in and refresh/recovery flows are task 04; shop/review/feed/media/moderation routes arrive in later tasks.

## Local setup

Prerequisites: Node.js compatible with the installed dependencies (verified with 24.17.0), pnpm and Docker Desktop/Engine with Compose. From the repository root:

```powershell
docker compose -f backend/docker-compose.dev.yml up -d --wait
cd backend
pnpm install --frozen-lockfile
```

Create `.env` from `.env.example` only if it does not exist, then configure a random JWT secret (32+ characters). Keep `.env` private. Database defaults match Docker: `postgresql://vero:vero@127.0.0.1:5433/vero?schema=public`. The Docker password is local-development configuration only.

```powershell
pnpm prisma:generate
pnpm db:migrate
pnpm start:dev
```

API: `/api`, Swagger: `/docs`, OpenAPI JSON: `/docs-json`, public health: `/api/health`. Default port is 3000. Set CORS_ORIGIN to the actual Expo web origin. Native clients reach the host API over their device/emulator network; they never connect to PostgreSQL directly.

For database lifecycle commands, ports and persistent volumes, see [Docker setup](../docs/12-docker-database.md).

## Forward migration and preserved data

Historical migration files are unchanged. The Vero foundation migration:

- Preserves user IDs, password hashes, profile fields and ADMIN permissions; maps DEVOPS/VIEWER to USER.
- Normalizes emails to trimmed lowercase. Conflicting normalized emails abort the transaction for manual resolution instead of merging accounts.
- Converts old user timestamp columns from the boilerplate's UTC timestamp convention to timestamptz.
- Moves eight CloudOps tables and their existing foreign keys/enums into `legacy_cloudops`. No legacy rows are dropped. Historical project/user references still work across schemas.
- Adds the Vero tables, indexes and SQL CHECK constraints. Public Prisma models only cover Vero.

Back up any real database and resolve normalization conflicts before upgrading it. Confirm old timestamps represent UTC if importing a database from elsewhere. Do not reset a database, edit applied migrations or drop `legacy_cloudops` to bypass upgrade issues. Its data retention/removal is a separate decision.

For new schema changes, generate a forward migration, inspect its SQL and preserve custom CHECK constraints. Use `db:migrate` (`prisma migrate deploy`) to apply committed migrations. Do not use schema push as a substitute for migration history.

## Development seed

Seed requires explicit NODE_ENV=development, SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD (12+ characters). There is no fallback admin password. Re-running it preserves existing account credentials and refuses to elevate/reactivate an existing non-admin/inactive account.

```powershell
pnpm db:seed
```

Set SEED_DEMO_DATA=true only when you want fictional development samples: a DEMO buyer, shop/link, category and two reviews from the same buyer. All visible sample content is labeled DEMO/fictional and uses reserved `.invalid` domains. Production seed is disabled.

## Available auth and users API

| Route | Access |
| --- | --- |
| POST /api/auth/register | Public; always creates USER, no verification gate |
| POST /api/auth/login | Public; email/password, returns access JWT |
| GET/PATCH /api/auth/me | Active authenticated account |
| PATCH /api/auth/me/password | Active account with an existing password |
| GET/POST /api/users | ADMIN |
| GET/PATCH/DELETE /api/users/:id | ADMIN; self-demotion/deactivation blocked |

Send access tokens through `Authorization: Bearer <token>`. Public reads must use the existing @Public decorator when their controllers are added; all endpoints otherwise require JWT. Google-only accounts are representable in the database but cannot use password login. Actual Google token verification/login is not implemented yet.

Errors include statusCode, stable code, message, timestamp and a path without query-string secrets. New public lists use the CursorQueryDto/CursorPage contract; existing admin user listing keeps its page/meta contract for compatibility. See [proposed endpoints](../docs/11-api-contract.md).

## Verification

```powershell
pnpm exec prisma validate
pnpm prisma:generate
pnpm build
pnpm lint
pnpm test --runInBand
```

Database/e2e tests create randomly named `vero_test_*` databases on local Docker and delete only those databases afterward. They require a maintenance connection with CREATE DATABASE permission; they never reset development data. Set this environment variable explicitly:

```powershell
$env:TEST_DATABASE_ADMIN_URL='postgresql://vero:vero@127.0.0.1:5433/postgres'
pnpm test:db
pnpm test:e2e
```

Build first for test:e2e; it starts the compiled API on a temporary port. It verifies populated legacy preservation, clean migration, schema drift, repeatable safe seed, constraints, concurrency and real HTTP registration/login/permissions/Swagger. Google provider/device tests belong to task 04 and Expo work.

## Structure

Feature boundaries: auth, users, shops, categories, reviews, media, feed, engagement, reports, moderation, prisma and health. Empty feature modules deliberately register no placeholder endpoints. The source of truth for implementation order is [the docs index](../docs/README.md).

No NestJS Observe integration is configured in this boilerplate. Deployment and production secrets are separate from local setup.
