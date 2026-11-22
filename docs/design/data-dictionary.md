# Vero data dictionary - task 02

Status: target design, ready for task 03 migration work. This document does not replace `backend/prisma/schema.prisma` yet.

## Conventions

All primary IDs are UUIDs, generated server-side. Unless explicitly nullable, fields are required. `createdAt` defaults to the current UTC instant; `updatedAt` is maintained on mutations. Store instant fields as PostgreSQL timestamptz and calendar-only fields as DATE. Enum values are uppercase. Public DTOs whitelist safe fields.

Keep the existing User `fullName` storage field initially to minimize auth churn; expose a displayName DTO or consistently rename it in task 03. Normalize emails by trimming/lowercasing, without provider-specific dot/plus rewriting. Existing normalization collisions require explicit migration resolution.

## Accounts

| Entity | Fields and defaults | Constraints / access |
| --- | --- | --- |
| User | id; email text; passwordHash text nullable; fullName text; avatarUrl text nullable (existing field); role USER/ADMIN default USER; isActive boolean default true; locale FR/AR default FR; deletedAt instant nullable; createdAt/updatedAt | Unique email; index role/isActive; never expose passwordHash; no verified-email gate |
| AuthIdentity | id; userId FK; provider GOOGLE; providerSubject text; createdAt/updatedAt | Unique(provider, providerSubject); index userId; user deletion cleanup |
| Session | id; userId FK; familyId UUID; refreshTokenHash text; expiresAt instant; consumedAt/revokedAt instants nullable; replacementId self-FK nullable; createdAt | Unique refreshTokenHash and non-null replacementId; indexes(userId, revokedAt), familyId, expiresAt; token values private |
| PasswordResetToken | id; userId FK; tokenHash text; expiresAt instant; consumedAt instant nullable; createdAt | Unique tokenHash; indexes userId/expiry; consume once atomically |

Google-only users have no password hash. To link a colliding email, authenticate the existing account; do not manufacture a second user with an altered email or silently attach the identity. Password recovery must not set a local password for an unauthenticated Google-only account.

Account deletion revokes sessions, removes auth identities/reset tokens, anonymizes identifying profile/email values and hides the user's reviews/comments, then schedules media cleanup under a documented retention policy. Retain tombstone IDs so reports/audit foreign keys remain meaningful. Replace email with a unique non-deliverable tombstone value so the original can be reused. Do not confuse this with suspension, which leaves existing content visibility unchanged. Retention periods and final purge implementation are release work, not assumed completed here.

## Shops

| Entity | Fields and defaults | Constraints / access |
| --- | --- | --- |
| Shop | id; name text 1-150; slug text; description text nullable; categoryId FK nullable; governorate text nullable; logoAssetId FK nullable; createdById User FK; status ACTIVE/HIDDEN/MERGED default ACTIVE; mergedIntoId self-FK nullable; createdAt/updatedAt | Unique slug; indexes(status, name), categoryId, mergedIntoId, createdById; merge target differs from self |
| ShopLink | id; shopId FK; platform INSTAGRAM/FACEBOOK/WEBSITE; originalUrl text; normalizedUrl text; identityKey text; handle text nullable; createdAt/updatedAt | Unique identityKey; index shopId; links move on merge |
| Category | id; key text; labelFr text; labelAr text; createdAt/updatedAt | Unique key; deleting an unused category permitted, otherwise unlink shops deliberately |

Identity keys include platform and canonical account/page identifier where known. Website keys preserve meaningful paths/queries for shared storefront hosts; a domain alone is not always a shop identity. Name similarity is a search hint, never a uniqueness constraint. A shop transaction must create at least one link. MERGED requires mergedIntoId; other states require it to be null. The service prevents redirect cycles and resolves chains.

Logo support is optional. When added, require an owned READY image and authorized profile attachment; a logo asset cannot also be a review image. MVP shop creation still requires only name/link.

## Reviews and media

| Entity | Fields and defaults | Constraints / access |
| --- | --- | --- |
| Review | id; authorId User FK; shopId FK; submissionId UUID; submissionHash text; rating smallint; text text 10-5000; productName text nullable up to 150; purchaseDate DATE nullable; status PUBLISHED/HIDDEN/DELETED default PUBLISHED; createdAt/updatedAt; deletedAt instant nullable | Unique(authorId, submissionId); rating 1-5; indexes(status, createdAt, id), (shopId, status, createdAt, id), authorId; deliberately no unique(authorId, shopId) |
| MediaAsset | id; uploaderId User FK; storageKey text; thumbnailKey text nullable; mimeType text nullable until validation; byteSize bigint nullable until validation; width/height integer nullable; status PENDING/READY/FAILED/DELETED default PENDING; expiresAt instant nullable for orphan cleanup; createdAt/updatedAt | Unique storageKey; indexes(uploaderId, status), (status, expiresAt); READY requires valid metadata; private storage references |
| ReviewImage | id; reviewId FK; mediaAssetId FK; position smallint; createdAt | Unique mediaAssetId; unique(reviewId, position); position 0-4; index reviewId |

Review images are an ordered 0-4 slot set. Database uniqueness and slot bounds cap it at five; service validation checks author ownership/readiness and rejects cross-purpose attachments. Do not expose PENDING bytes. When deleting/hiding content, stop issuing media links immediately; signed responses already issued have a proposed maximum five-minute lifetime. No immutable public CDN URL should bypass moderation.

Deletion is initially soft, and public queries always filter visibility. Foreign keys from reviews to users/shops restrict accidental hard deletes. A deliberate retention purge must handle child attachments/engagement, preserve necessary report/audit references and remove underlying blobs safely. Do not cascade account deletion through all content without the explicit lifecycle workflow.

## Engagement, reports and audit

| Entity | Fields and defaults | Constraints / access |
| --- | --- | --- |
| ReviewLike | userId FK; reviewId FK; createdAt | Composite primary key(userId, reviewId); index(reviewId, createdAt, userId); idempotent like/unlike |
| ReviewComment | id; authorId FK; reviewId FK; text 1-2000; status PUBLISHED/HIDDEN/DELETED default PUBLISHED; createdAt/updatedAt; deletedAt instant nullable | Index(reviewId, status, createdAt, id); index authorId; no parentCommentId in MVP |
| Report | id; reporterId User FK; shopId/reviewId/commentId nullable FKs; reason SPAM/ABUSE/MISLEADING/WRONG_SHOP/DUPLICATE_SHOP/OTHER; details text nullable up to 2000; status OPEN/RESOLVED/DISMISSED default OPEN; resolvedById User FK nullable; resolvedAt instant nullable; resolutionReason text nullable; createdAt/updatedAt | CHECK exactly one target; indexes(status, createdAt, id), reporterId and each target; terminal resolution requires admin/time/reason |
| ModerationAction | id; adminId User FK; targetType SHOP/REVIEW/COMMENT/USER/REPORT; targetId UUID; action text constrained by service action set; reason text; previousState/newState JSON nullable; createdAt | Index(targetType, targetId, createdAt), adminId; append-only through application; never public |

Reports use real target FKs. ModerationAction deliberately stores a logical target reference so audit survives later purges; the service validates target existence and admin permission at action time. State JSON holds minimal status/merge metadata, not passwords, tokens or unnecessary copies of personal content. Suggested action set: HIDE, RESTORE, MERGE, CORRECT, SUSPEND, REACTIVATE, RESOLVE_REPORT, DISMISS_REPORT.

## Trending snapshots

| Entity | Fields and defaults | Constraints / access |
| --- | --- | --- |
| FeedSnapshot | id; algorithmVersion text; createdAt; expiresAt instant | Index expiresAt; proposed TTL five minutes |
| FeedSnapshotEntry | snapshotId FK; reviewId FK; rank integer; score double precision | Primary key(snapshotId, rank); unique(snapshotId, reviewId); rank > 0; index reviewId |

Store a bounded candidate ranking (proposed maximum 500 eligible reviews) transactionally, reuse compatible snapshots during the TTL, and clean expired rows on a scheduled task. Entries cascade when their snapshot is purged. Current visibility is rechecked when reading each page, even before expiry. Candidate limit and algorithm version are explicit response metadata so pagination does not imply unlimited history.

## Migration-only checks and service invariants

Task 03 must implement checks Prisma cannot express directly as forward SQL migrations. This list is the design contract, not executed SQL.

| Rule | Enforcement |
| --- | --- |
| Review stars in 1-5 | DTO validation plus database CHECK |
| Review image position 0-4 | CHECK plus unique(reviewId, position) |
| Report has one target | CHECK: exactly one of shopId/reviewId/commentId is non-null |
| MERGED has a non-self target; other shop states do not | CHECK plus self-FK; service prevents multi-row cycles |
| READY media has positive byteSize/dimensions and accepted MIME | CHECK required metadata plus actual-byte validation in media service |
| Text lengths and whitespace | DTO normalization plus suitable database length checks |
| Session/reset/snapshot expiry follows creation | CHECK; runtime rejects elapsed expiry |
| Shop has a link, media belongs to author, parent is visible, report actor is admin | Transactional service invariants; cross-row checks are not simple CHECK constraints |

## Verification handoff

Task 03 validates/generates Prisma and inspects generated SQL on an isolated Docker database. Later service tests exercise concurrent link creation, review submission retries, media attachment races, token consumption and moderation/merge races. Task 02 verifies design consistency only; none of those runtime checks are marked passed.
