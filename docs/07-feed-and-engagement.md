# 07 - Latest, Trending, likes and comments

Depends on: 06. "Viral" is presented as Trending; feed items are shop reviews and comments are their replies.

## Steps

- [ ] Add public GET /api/feed?sort=latest|trending using the same Review records as shop profiles.
- [ ] Latest sorts by original publishedAt/createdAt descending, then ID descending. Editing a review does not bump it into Latest again.
- [ ] Feed cards show author/avatar, shop, stars, text preview, optional photos, publication date, like count, visible-comment count and actions to like/comment/share/report. Tap shop -> profile; tap review -> detail.
- [ ] Add idempotent PUT/DELETE like endpoints with unique(userId, reviewId). Guests can browse and are prompted to sign in when interacting, with context retained.
- [ ] Add flat comments: create/list/edit/delete; author controls their own text. Publish immediately. Hidden parent reviews cannot receive new engagement or expose comments.
- [ ] Implement deterministic cursor pagination for Latest. For Trending, use a short-lived ranking snapshot identified in the cursor so score changes do not cause duplicate/skipped cards during a session. Initial implementation can materialize a bounded candidate ranking; do not introduce Redis solely for this.

## Proposed Trending v1

Use eligible reviews from the past seven days. Count engagement from the preceding 48 hours, excluding the review author's own activity and inactive accounts. Count each other account at most once per signal, regardless of repeated comments.

```text
score = (distinct recent likers + 2 * distinct recent commenters)
        / (age_in_hours + 2)^1.2
```

This is a tunable product default, not a claim of fraud detection. Eligible interactions and parent content must be visible. Break score ties with publication date and ID. With no engagement, fall back to newest eligible reviews; show an empty state if there are none. Never fabricate popularity or count share-button clicks as confirmed external shares.

- [ ] Implement shareable web URLs and native sharing for review/shop details. Shared links have a usable web destination when the app is absent.
- [ ] Apply lightweight request limits in the background and allow reporting individual comments as well as reviews.

## Acceptance

- [ ] A published review appears in Latest and on its shop without a second post record.
- [ ] Likes are idempotent; repeated comments by one person do not multiply the distinct-commenter score.
- [ ] Recent independent engagement can raise a review, and time decay lowers old activity.
- [ ] Pagination remains consistent while engagement changes.
- [ ] Hidden reviews/comments and inactive-account engagement do not influence public results.
