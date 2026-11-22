# 03 - Adapt the existing foundation

Depends on: 01 and 02. This is the first coding step.

## Steps

- [ ] Read backend/AGENTS.md and inspect package.json, pnpm-lock.yaml, Prisma config, migrations, seed and existing tests.
- [ ] Record baseline build/lint/test results before changing behavior. Existing failures must be distinguished from regressions.
- [ ] Rename CloudOps API/package descriptions to Vero without changing unrelated tooling.
- [ ] Replace DEVOPS/VIEWER domain semantics with USER/ADMIN in schema, guards, DTOs, seed, tests and documentation. Map existing VIEWER/DEVOPS users to USER and preserve ADMIN users.
- [ ] Add the Vero entities from 02 through forward migrations. Inspect existing database contents and CloudOps foreign keys before removing obsolete tables; preserve/export needed data and stage destructive changes explicitly.
- [ ] Retain Prisma, email/password hashing, global guards, validation, throttling, exception handling, Swagger and health checks.
- [ ] Create feature module boundaries and consistent error/pagination DTOs. Explicitly mark public read endpoints because the global auth guard otherwise blocks them.
- [ ] Add non-secret environment examples for API/database, JWT/session settings, allowed web origins, Google client IDs, media and recovery email.
- [ ] Provide a safe development seed with sample shops/reviews and a deliberately configured admin. No hardcoded production credentials.

## Checks

From backend/: `pnpm exec prisma validate`, `pnpm prisma:generate`, `pnpm build`, `pnpm lint`, and relevant tests. Use the existing local PostgreSQL setup after inspecting it. Do not execute db:reset or rewrite applied migrations to make checks pass.

## Done when

- [ ] A clean development database can migrate and seed.
- [ ] A representative existing database can migrate while preserving accounts and required data.
- [ ] Email/password login and admin authorization still work with the new roles.
- [ ] Swagger describes Vero and no active code depends on removed CloudOps models.
