# 05 - Shops, links and search

Depends on: 03; authenticated creation uses 04.

Status: implemented and locally verified on 2026-11-22. The composer preserves the selected shop and draft; actual review publication arrives in task 06.

## Steps

- [x] Implement GET /api/shops for name/handle/URL search and GET /api/shops/:id for public profiles. Include only active shops.
- [x] Parse URL input safely. Allow http/https websites; identify Instagram/Facebook using parsed hostnames, never substring matching. Reject unsupported schemes and non-shop social links with a helpful message.
- [x] Remove known tracking parameters and normalize equivalent platform URLs, hostname case and applicable trailing slashes. Preserve case-sensitive website paths and meaningful query parameters; do not merge shops solely by matching a domain on shared storefront hosts.
- [x] Match exact canonical link identities first, then handles/names. Plain handles can produce platform-specific candidates; do not silently assume a platform.
- [x] Implement POST /api/shops with name and at least one link. Description/category/governorate remain optional. Use database uniqueness and return the existing match on duplicate creation, including concurrent requests.
- [x] Search results show name, platform/handle, average stars and visible-review count. Similar names remain separate until explicitly resolved.
- [x] Build search -> existing shop -> composer, and empty result -> prefilled add shop -> composer. Preserve draft state if login is interrupted.
- [x] Reserve link editing and merges for admins initially. Adding alternate identities must not let arbitrary users redirect another shop's reputation.
- [x] Avoid fetching arbitrary pasted URLs on the server in the MVP. A plain link is enough; metadata fetching would need separate SSRF protections.

## Acceptance

- [x] Equivalent Instagram URLs resolve to one shop.
- [x] An existing link takes the user to the existing shop rather than an error dead end.
- [x] Name-only input is preserved while the add-shop form asks for a link.
- [x] Separate businesses with similar names are not automatically merged.
- [x] Creation needs no ownership proof or admin approval and immediately continues to a review.


## Verification evidence

Backend tests cover equivalent Instagram/Facebook identities, rejected post/group/unsafe links, meaningful website paths/queries, deceptive social hostnames, concurrent creation, same-name shops with different identities, cursor/query mismatches and visible-only rating summaries. A duplicate returns the existing shop without attaching arbitrary alternate links.

Playwright browser tests passed with the real local API: public search, missing-name prefill, signup/login returning to the add form, creation continuing to the selected-shop composer, equivalent URL lookup, draft retention, empty ratings and Arabic/desktop layouts. Input fields, result rows and navigation share the concept tokens in docs/design/ui-verification.md.

No server-side fetch is performed for submitted links. New shops appear immediately; no ownership or admin approval is required. Public profiles resolve merged IDs but suppress hidden shops. Public review-list routes are task 06.
