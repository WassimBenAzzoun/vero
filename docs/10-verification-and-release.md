# 10 - Verification and pilot release

Depends on: all implementation steps. Local implementation checks and deployment have completed; remaining device/provider/operations items are explicitly open. See 13-deployment.md for concrete evidence.

## Automated verification

- [x] Backend build/lint and relevant unit/integration tests pass. Validate/generate Prisma; run migrations against an isolated PostgreSQL database.
- [x] Exercise local and Google auth, safe account linking, refresh rotation, logout, reset expiry and inactive users.
- [x] Exercise duplicate-link races, author/admin permissions, repeated reviews, idempotent publish/likes, media ownership and upload limits.
- [x] Verify create/edit/delete/hide/restore/merge rating calculations and feed visibility.
- [x] Verify Latest ordering, deterministic Trending scoring, distinct engagement and cursor behavior.
- [x] Document and run frontend type/lint checks using the scripts actually installed.

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

- [x] Separate Docker development/isolated tests from Supabase production; configure secrets, HTTPS, CORS, release migrations and verify live health.
- [ ] Establish dedicated staging and an external health-monitor alert policy before a wider public pilot.
- [x] Verify local backup/restore and a production PostgreSQL 17 dump restore into isolated Docker; verify private media access and credential-free application request logs.
- [ ] Configure off-machine backup retention for database/objects and an operational error-monitoring/alert destination.
- [x] Deploy server-rendered Expo web. Local real shop/review HTML and ratings checks pass; live health, HTML, robots, sitemap and private object access pass.
- [ ] Prepare Android testing APK and store AAB, and iOS test distribution/build credentials. Check current store submission requirements at release time, including authentication/account deletion requirements relevant to Google sign-in.
- [x] Keep all demo reviews outside production; production starts with no seeded reviews.
- [x] Promote the owner's existing Google account to ADMIN, preserving its password-free sign-in.
- [ ] Measure search success/no-results, review completion, Google failures, upload errors, feed interaction and report turnaround. Keep analytics free of review drafts and credentials.

Publishing/deployment and provider-console changes are separate tasks. Record exact environments, commands, screenshots/device evidence and any unverified flow before declaring a pilot ready.


Release evidence: 25 unit tests plus isolated migration/auth/shop/review/media/feed/moderation scenarios passed, as did Docker backup restoration, frontend type/lint, web/Android/iOS bundle exports, browser review/photo/moderation/engagement and Google-only profile regression checks. Google web login was reported by the user. Native device Google cancellation/RTL/keyboard/sharing remain unverified. Production SMTP is intentionally disabled until provider credentials are supplied. A corrected Android APK build is in progress; no store publication or iOS credentials are claimed.
