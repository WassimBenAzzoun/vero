# 01 - Product and UX

## Purpose

Help people in Tunisia decide where to buy by reading and publishing experiences about shops selling through Instagram, Facebook and websites.

## Agreed rules

- Guests browse shops, reviews and feed. Active signed-in users publish, like, comment and report.
- Any account can review any shop. Multiple reviews per user/shop are allowed; representatives have no special restriction.
- No email verification, receipt, ownership claim or pre-publication admin approval is required.
- Reviews and comments publish immediately. Admins handle moderation afterward.
- Shop creation requires only a name and one page/website link; other fields are optional.
- Review requires shop, integer rating 1-5 and text. Product name, purchase date and photos are optional.
- Users edit/delete their own reviews and comments. Admins hide/remove content and manage accounts.
- Feed entries are reviews; comments are unstarred replies underneath them.

## Core journey

1. Enter a name, handle or shop link.
2. Select an existing result and immediately open the review form.
3. When no result exists, offer Add shop, prefilled with known input. Save name and link, then return directly to the review form.
4. Enter stars/text, optionally add photos or product name, and publish.
5. Show the published review and shop. The same review is available in Latest.

If authentication is needed, retain the search input, selected shop and draft, then resume after email/password or Google login. A canceled login must not destroy the draft.

## Screens and navigation

Main mobile destinations: Feed, Search, Write a review, Profile. Review composition is a focused flow; web adapts navigation to available width.

Screens: Latest/Trending feed, search/results, add shop, shop profile, review composer, review detail/comments/photos, login/register/recovery, profile/my reviews, account settings and admin screens. Include loading, empty, retry, offline and permission-denied states.

Shop profiles show name, links, optional details, average stars, visible-review count, star histogram, review filters and Write a review. No reviews means "No reviews yet", not zero stars.

## Scope boundaries

Include likes, flat comments, sharing, reporting, admin moderation, French/Arabic and RTL. Defer saved shops, threaded replies, official business ownership/replies, verification badges, social-review imports, structured product catalogs, AI summaries, notifications and payments.

## Acceptance

- [ ] A new account can immediately publish without additional verification.
- [ ] Existing and missing shops both lead to publication without re-entering context.
- [ ] Multiple reviews for the same shop are accepted.
- [ ] Public feed, detail and shop views represent the same review record.
- [ ] No report or routine edit places content into a mandatory approval queue.
