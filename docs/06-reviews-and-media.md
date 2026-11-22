# 06 - Reviews, photos and ratings

Depends on: 04 and 05.

## Steps

- [ ] Implement create/list/detail/edit/delete review endpoints. Use signed-in user identity from the guard, never an author ID from the body.
- [ ] Validate 1-5 integer stars and non-empty text. Proposed limits: 10-5000 characters, product name up to 150 characters, at most five photos. Keep purchase date optional and reject impossible/future dates.
- [ ] Publish valid reviews immediately with PUBLISHED status, including repeated reviews by one user for one shop.
- [ ] Enforce author-only content edits/deletes. Admins moderate visibility through separate endpoints.
- [ ] Add an authenticated media-upload service: issue upload intent, validate actual bytes/type/size and dimensions, strip EXIF metadata, generate suitable thumbnails and mark assets ready. Proposed cap: 10 MB per source image with client compression; support a documented phone-photo conversion path where needed.
- [ ] Only attach ready assets owned by the author; prevent attaching another user's images or reusing one asset on unrelated reviews. Keep previews/drafts while an upload retries. Users can publish text-only without waiting for optional photo retries.
- [ ] Store storage keys, not expiring URLs. Resolve read access through the visibility policy in 02, and clean up abandoned uploads after a documented retention interval.
- [ ] Implement paginated shop reviews with star and has-photo filters. The detail view includes flat comments and a photo viewer.
- [ ] Recalculate public average/count/histogram on publication, star edits, author deletion, admin hide/restore and merges. Share this logic with moderation.
- [ ] Make retrying one publish safe with a client submission ID/idempotency key. This prevents accidental duplicate network retries without blocking deliberate additional reviews.

## Acceptance

- [ ] A new user posts a review with no verification or receipt step.
- [ ] Two deliberate reviews of one shop by the same author succeed; one retried request creates one review.
- [ ] Another account cannot edit/delete the review or attach its images.
- [ ] Non-image/oversize files are rejected; public output excludes credential/internal storage details.
- [ ] Rating summaries match visible reviews after all mutations.
- [ ] Failed uploads and interrupted login preserve useful draft content.
