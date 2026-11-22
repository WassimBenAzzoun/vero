# 10 - Verification and pilot release

Depends on: all implementation steps. This checklist describes future work, not checks already performed.

## Automated verification

- [ ] Backend build/lint and relevant unit/integration tests pass. Validate/generate Prisma; run migrations against an isolated PostgreSQL database.
- [ ] Exercise local and Google auth, safe account linking, refresh rotation, logout, reset expiry and inactive users.
- [ ] Exercise duplicate-link races, author/admin permissions, repeated reviews, idempotent publish/likes, media ownership and upload limits.
- [ ] Verify create/edit/delete/hide/restore/merge rating calculations and feed visibility.
- [ ] Verify Latest ordering, deterministic Trending scoring, distinct engagement and cursor behavior.
- [ ] Document and run frontend type/lint checks using the scripts actually installed.

## End-to-end acceptance

1. Guest browses Latest and searches a pasted Instagram URL.
2. User signs in through email/password or Google and retains search/draft context.
3. Existing shop opens the composer; missing shop is added using only name/link.
4. User publishes a photo review immediately and sees it on the shop and Latest.
5. Another user likes/comments; Trending reflects eligible recent engagement.
6. Author edits/deletes their own content; another user cannot.
7. A report leaves content visible; admin hides it and all public surfaces/ratings update.
8. Admin restores it, merges duplicate shops and suspends an account; redirects and permissions remain correct.

Run on real Android/iOS development builds and web desktop/mobile widths. Include Google cancellation, offline/retry, slow uploads, expired sessions, RTL, keyboard avoidance, screen-reader labels and shared-link cold starts. Mocks do not count as real provider/device verification.

## Pilot preparation

- [ ] Separate development/staging/production databases, storage and auth configuration. Configure secrets, HTTPS, CORS, migrations and monitored health checks.
- [ ] Confirm backup restoration, media access/retention, error monitoring and logs that redact passwords/tokens.
- [ ] Deploy the chosen indexable Expo web rendering and verify newly created shop/review URLs and updated ratings.
- [ ] Prepare Android testing APK and store AAB, and iOS test distribution/build credentials. Check current store submission requirements at release time, including authentication/account deletion requirements relevant to Google sign-in.
- [ ] Seed clearly labeled demo content only outside production; do not manufacture consumer reviews.
- [ ] Have an admin ready to handle reports during the pilot.
- [ ] Measure search success/no-results, review completion, Google failures, upload errors, feed interaction and report turnaround. Keep analytics free of review drafts and credentials.

Publishing/deployment and provider-console changes are separate tasks. Record exact environments, commands, screenshots/device evidence and any unverified flow before declaring a pilot ready.
