# 06 - Reviews, photos and ratings

Depends on: 04 and 05.

Implemented and locally verified on 2026-11-22. Browser checks covered choosing/compressing a photo, publication, detail, author edits and deletion. Isolated PostgreSQL/S3Mock scenarios covered ownership, actual image bytes, EXIF removal, repeat reviews, concurrent retries and visibility. Comments arrive in task 07; admin rating changes in task 08. Native device verification remains pending.

Storage: local Docker S3Mock; production private Supabase Storage. Originals are normalized to JPEG (up to 1800px), with 480px thumbnails. The API checks parent visibility on every media read. Unattached uploads expire after 24 hours; deleted review media is eligible for removal after seven days. Cleanup runs hourly. Phone selections convert to JPEG before uploading; server accepts supported HEIF images as well as JPEG/PNG/WebP.

## Steps

- [x] Implement create/list/detail/edit/delete review endpoints. Use signed-in user identity from the guard, never an author ID from the body.
- [x] Validate 1-5 integer stars and non-empty text. Proposed limits: 10-5000 characters, product name up to 150 characters, at most five photos. Keep purchase date optional and reject impossible/future dates.
- [x] Publish valid reviews immediately with PUBLISHED status, including repeated reviews by one user for one shop.
- [x] Enforce author-only content edits/deletes. Admins moderate visibility through separate endpoints.
- [x] Add an authenticated media-upload service: issue upload intent, validate actual bytes/type/size and dimensions, strip EXIF metadata, generate suitable thumbnails and mark assets ready. Proposed cap: 10 MB per source image with client compression; support a documented phone-photo conversion path where needed.
- [x] Only attach ready assets owned by the author; prevent attaching another user's images or reusing one asset on unrelated reviews. Keep previews/drafts while an upload retries. Users can publish text-only without waiting for optional photo retries.
- [x] Store storage keys, not expiring URLs. Resolve read access through the visibility policy in 02, and clean up abandoned uploads after a documented retention interval.
- [x] Implement paginated shop reviews with star and has-photo filters and a detail photo viewer. Flat comments continue in task 07.
- [x] Recalculate public average/count/histogram on publication, star edits, author deletion, admin hide/restore and merges. Share this logic with moderation.
- [x] Make retrying one publish safe with a client submission ID/idempotency key. This prevents accidental duplicate network retries without blocking deliberate additional reviews.

## Acceptance

- [x] A new user posts a review with no verification or receipt step.
- [x] Two deliberate reviews of one shop by the same author succeed; one retried request creates one review.
- [x] Another account cannot edit/delete the review or attach its images.
- [x] Non-image/oversize files are rejected; public output excludes credential/internal storage details.
- [x] Rating summaries match visible reviews after all mutations.
- [x] Failed uploads and interrupted login preserve useful draft content.

