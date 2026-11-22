# 03 - Adapt the existing foundation

Depends on: 01 and 02. This is the first coding step.

Status: completed and verified on 2026-11-22. Google provider login and consumer feature endpoints remain in their later tasks.

## Steps

- [x] Read backend/AGENTS.md and inspect package.json, pnpm-lock.yaml, Prisma config, migrations, seed and existing tests.
- [x] Record baseline build/lint/test results before changing behavior. Existing failures must be distinguished from regressions.
- [x] Rename CloudOps API/package descriptions to Vero without changing unrelated tooling.
- [x] Replace DEVOPS/VIEWER domain semantics with USER/ADMIN in schema, guards, DTOs, seed, tests and documentation. Map existing VIEWER/DEVOPS users to USER and preserve ADMIN users.
- [x] Add the Vero entities from 02 through forward migrations. Inspect existing database contents and CloudOps foreign keys before removing obsolete tables; preserve/export needed data and stage destructive changes explicitly.
- [x] Retain Prisma, email/password hashing, global guards, validation, throttling, exception handling, Swagger and health checks.
- [x] Create feature module boundaries and consistent error/pagination DTOs. Explicitly mark public read endpoints because the global auth guard otherwise blocks them.
- [x] Add non-secret environment examples for API/database, JWT/session settings, allowed web origins, Google client IDs, media and recovery email.
- [x] Provide a safe development seed with sample shops/reviews and a deliberately configured admin. No hardcoded production credentials.

## Checks

From backend/: `pnpm exec prisma validate`, `pnpm prisma:generate`, `pnpm build`, `pnpm lint`, and relevant tests. Use the existing local PostgreSQL setup after inspecting it. Do not execute db:reset or rewrite applied migrations to make checks pass.

## Done when

- [x] A clean development database can migrate and seed.
- [x] A representative existing database can migrate while preserving accounts and required data.
- [x] Email/password login and admin authorization still work with the new roles.
- [x] Swagger describes Vero and no active code depends on removed CloudOps models.

## Implementation and verification evidence

Baseline before edits: dependency installation from the existing lockfile, Prisma generation/validation, build and lint passed; two suites / nine unit tests passed. Installed versions were retained (Prisma 7.10.1); no framework upgrade was required.

The forward migration `20261122000100_vero_foundation` creates Vero tables and SQL CHECK constraints, normalizes account emails, maps roles, and archives CloudOps tables/enums in `legacy_cloudops` without dropping their data or foreign keys. Existing IDs/password hashes remain intact. Email-normalization collisions abort transactionally for explicit resolution.

`test/foundation-db.ts` uses isolated random local Docker databases, never the development database. It verifies a populated legacy upgrade, clean migration deployment and no Prisma schema drift, repeatable seed without credential reset, production seed rejection, repeated reviews, Google-only account storage, invalid ratings/text/report targets/media metadata, the five-image cap, submission uniqueness and concurrent link/like uniqueness. With `--http`, it starts the compiled API and verifies registration/login/profile, USER versus ADMIN access, Google-only password-login rejection, public health, stable error codes and Swagger metadata.

The development Docker database also received all three migrations and the fictional development seed. It has 17 public tables including Prisma migration history and eight preserved legacy tables. Local JWT/admin credentials are randomly generated in ignored `backend/.env`; they are not committed or printed. The seed admin email is `admin@vero.invalid`; its local password is in that file.

Module boundaries have no placeholder consumer endpoints. New public cursor DTOs coexist with the existing admin user page/meta API. Query strings are removed from response paths/request logs so future recovery links do not expose their token parameters there. Real Google authentication, session rotation, media processing and visibility enforcement through consumer APIs are still later implementation tasks.
