# 05 - Shops, links and search

Depends on: 03; authenticated creation uses 04.

## Steps

- [ ] Implement GET /api/shops for name/handle/URL search and GET /api/shops/:id for public profiles. Include only active shops.
- [ ] Parse URL input safely. Allow http/https websites; identify Instagram/Facebook using parsed hostnames, never substring matching. Reject unsupported schemes and non-shop social links with a helpful message.
- [ ] Remove known tracking parameters and normalize equivalent platform URLs, hostname case and applicable trailing slashes. Preserve case-sensitive website paths and meaningful query parameters; do not merge shops solely by matching a domain on shared storefront hosts.
- [ ] Match exact canonical link identities first, then handles/names. Plain handles can produce platform-specific candidates; do not silently assume a platform.
- [ ] Implement POST /api/shops with name and at least one link. Description/category/governorate remain optional. Use database uniqueness and return the existing match on duplicate creation, including concurrent requests.
- [ ] Search results show name, platform/handle, average stars and visible-review count. Similar names remain separate until explicitly resolved.
- [ ] Build search -> existing shop -> composer, and empty result -> prefilled add shop -> composer. Preserve draft state if login is interrupted.
- [ ] Reserve link editing and merges for admins initially. Adding alternate identities must not let arbitrary users redirect another shop's reputation.
- [ ] Avoid fetching arbitrary pasted URLs on the server in the MVP. A plain link is enough; metadata fetching would need separate SSRF protections.

## Acceptance

- [ ] Equivalent Instagram URLs resolve to one shop.
- [ ] An existing link takes the user to the existing shop rather than an error dead end.
- [ ] Name-only input is preserved while the add-shop form asks for a link.
- [ ] Separate businesses with similar names are not automatically merged.
- [ ] Creation needs no ownership proof or admin approval and immediately continues to a review.
