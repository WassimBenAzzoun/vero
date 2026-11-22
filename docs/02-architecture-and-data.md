# 02 - Architecture and data conception

## Architecture

Expo/React Native/TypeScript (iOS, Android, web) calls one NestJS REST API. Prisma accesses PostgreSQL. Object storage holds photos; an email provider handles password recovery. Start as a modular monolith. Redis, queues, microservices and external search are not initial requirements.

Backend modules: auth, users, shops, categories, reviews, media, feed, engagement, reports, moderation, prisma and health. Frontend uses Expo Router, feature modules, shared UI tokens, an API client and query caching; choose compatible package versions when scaffolding.

## Target entities

| Entity | Fields / relationships |
| --- | --- |
| User | UUID, normalized unique email, nullable passwordHash, display name, avatar, USER/ADMIN role, active flag, locale, timestamps |
| AuthIdentity | User, provider GOOGLE, providerSubject; unique(provider, providerSubject) |
| Session | User, hashed refresh token, expiry, revocation, token-family metadata |
| PasswordResetToken | User, token hash, expiry, consumed timestamp |
| Shop | UUID, name, unique slug, optional description/category/governorate/logo, creator, ACTIVE/HIDDEN/MERGED status, mergedIntoId, timestamps |
| ShopLink | Shop, platform, original URL, canonical identity key, normalized URL, optional handle; canonical identity key unique |
| Category | Key and French/Arabic labels |
| Review | User, shop, rating, text, optional productName/purchaseDate, PUBLISHED/HIDDEN/DELETED status, timestamps |
| MediaAsset | Uploader, storage key, detected MIME, byte size, dimensions, processing status, timestamps |
| ReviewImage | Review, media asset, display order; unique asset attachment |
| ReviewLike | User, review, createdAt; unique(userId, reviewId) |
| ReviewComment | User, review, text, PUBLISHED/HIDDEN/DELETED status, timestamps |
| Report | Reporter, exactly one review/comment/shop target, reason, optional details, OPEN/RESOLVED/DISMISSED status, resolution metadata |
| ModerationAction | Acting admin, target ID/type, action, reason, timestamp and relevant before/after state |

Implement exactly-one report target with nullable foreign keys plus a PostgreSQL CHECK constraint, rather than an unconstrained arbitrary target ID. Keep moderation references usable after soft deletion.

## Constraints and indexes

- Enforce integer rating range with validation and a database CHECK constraint.
- Do not create a unique(userId, shopId) constraint on Review.
- Use foreign keys and database uniqueness to resolve concurrent duplicate shop creation and repeated likes.
- Index reviews by (status, createdAt, id), (shopId, status, createdAt, id), and author; comments by (reviewId, status, createdAt, id).
- Index normalized shop identity for exact lookup. Add measured name-search indexes (such as pg_trgm) when implementing search; retain Unicode display names.
- Index session/reset hashes and expiry, open reports, and recent engagement used by Trending.
- Dates are stored in UTC; localize display. Prices are deferred unless needed; any later monetary fields use explicit currency and decimal/minor-unit storage.

## Visibility and ratings

Only published reviews under active shops contribute to public lists and rating summaries. Hidden/deleted parents suppress their comments and media access. Private administrative queries explicitly opt into hidden content.

Start with database aggregates for count, average and histogram. If cached counters become necessary, update them transactionally for create/edit/delete/hide/restore and shop merge. Repeated reviews count separately under the agreed policy. Calculate distinct engaged users separately for Trending.

## File access

Use a private bucket and API-authorized or short-lived signed reads. Public review media can be delivered to guests after a visibility check. Do not persist expiring signed URLs as permanent asset identities. Retired media URLs expire quickly; document cache lifetime and invalidate derived thumbnails when hiding content.

## Acceptance

- [ ] Diagram/model review matches the product rules and Google-only accounts.
- [ ] Database constraints survive concurrent requests.
- [ ] Visibility is applied consistently to ratings, search, feed, comments and media.
