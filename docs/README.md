# Vero implementation guide

Status: tasks 01/02 specifications and task 03 backend foundation completed on 2026-11-22. Local PostgreSQL uses Docker Compose and Vero migrations are applied. Consumer feature runtime acceptance remains pending. Next: task 04 authentication including Google.

## Coding order

| Order | Document | Result |
| --- | --- | --- |
| 1 | [Product and UX](01-product-and-ux.md) | Agreed scope, screens and publishing rules |
| 2 | [Architecture and data](02-architecture-and-data.md) | Module boundaries and target database model |
| 3 | [Foundation and migration](03-foundation-and-migration.md) | Adapt the existing CloudOps boilerplate safely |
| 4 | [Authentication including Google](04-authentication-and-google.md) | Reuse auth and add Google across platforms |
| 5 | [Shop search and creation](05-shops-and-search.md) | Find a shop or add it without losing context |
| 6 | [Reviews and photos](06-reviews-and-media.md) | Publish reviews directly and update ratings |
| 7 | [Feed and engagement](07-feed-and-engagement.md) | Latest, Trending, likes and comments |
| 8 | [Admin moderation](08-admin-moderation.md) | Moderate published content and merge duplicates |
| 9 | [Frontend and brand](09-frontend-and-brand.md) | Expo screens, brand tokens and localization |
| 10 | [Verification and release](10-verification-and-release.md) | Verify the complete flow and prepare a pilot |
| Reference | [API contract](11-api-contract.md) | Proposed REST endpoints and shared conventions |
| Reference | [Docker database](12-docker-database.md) | Local PostgreSQL startup, connection and persistence |
| Reference | [Data dictionary](design/data-dictionary.md) | Target fields, constraints and lifecycle rules |

Implement each step with its relevant frontend flow rather than completing the entire backend before trying the app. The frontend document applies from the first visible screen onward.

## Initial repository baseline (before task 03)

- `backend/` has NestJS, Prisma/PostgreSQL, JWT email/password login, registration, profile/password changes, admin user management, global JWT/role guards, validation, throttling, Swagger and health checks.
- Existing auth issues access tokens. Google login, refresh sessions and password recovery are planned additions, not existing functionality.
- The Prisma schema, seed and role names currently belong to CloudOps. They require a Vero migration.
- `frontend/` and `docs/` were empty when inspected. No Expo version or frontend package choices have been installed by this plan.
- Backend uses pnpm. Existing nested instructions remain in `backend/AGENTS.md`; root guidance is in `../AGENTS.md`.

## First milestones

1. Sign in with email/password or Google and return to the interrupted review draft.
2. Paste a shop link -> find/add shop -> publish a photo review -> see its public rating.
3. See that same review in Latest, like/comment on it, and exercise Trending.
4. Report it -> admin hides it -> it disappears from public views and rating totals.

Design deliverables and runtime acceptance are tracked separately. Check a runtime task only after implementation and verification. Defaults such as upload limits and ranking weights can be tuned without adding submission steps.

## Task progress

| Task | Design deliverable | Runtime verification |
| --- | --- | --- |
| 01 - Product and UX | Complete: routes, flows, form rules and acceptance scenarios | Pending implementation |
| 02 - Architecture and data | Complete: module boundaries, ER diagram, data dictionary, visibility and transactions | Pending task 03 migrations and later services |
| 03 - Foundation and migration | Implemented: Vero schema, forward migration, roles, module boundaries and safe seed | Build/lint, unit tests, isolated migration/concurrency and HTTP checks passed |
| 04-10 | Planned | Not started |
