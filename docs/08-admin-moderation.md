# 08 - Admin moderation after publication

Depends on: 05-07. No pre-publication review queue.

## Steps

- [ ] Add authenticated reports for reviews, comments and shops with reason plus optional details. Content remains visible until an admin acts.
- [ ] Build protected web admin screens for open reports, recent reviews/comments, shops and users. All endpoints enforce ADMIN on the backend.
- [ ] Add hide/restore actions for published reviews/comments, with an admin reason and ModerationAction record. Preserve content for moderation rather than overwriting authors' words.
- [ ] Add shop correction, hide/restore, and merge. Merge links/reviews transactionally, retain the old shop as a redirect, reject merge cycles, handle duplicate identities and update ratings. Multiple author reviews stay valid after a merge.
- [ ] Add account suspension/reactivation with immediate session revocation. Suspension prevents further access to protected actions; existing content stays under its own moderation state unless explicitly hidden.
- [ ] On review hide/delete, exclude it from feeds, shop reviews, public detail, comments, search snippets and rating totals. Stop issuing media links and expire cached links according to the documented media policy.
- [ ] Hiding a shop suppresses its reviews publicly without overwriting individual review states. Restoring the shop must not restore reviews that were separately hidden/deleted.
- [ ] Resolve/dismiss reports separately from content actions and preserve admin audit history. Prevent admins from accidentally removing their own final administrative access.
- [ ] Tell authors when accessing their own hidden content; do not expose moderation reasons or hidden text to unrelated visitors.

## Acceptance

- [ ] An ordinary USER cannot call admin endpoints or spoof an admin role.
- [ ] Reporting alone never hides content or blocks later submissions.
- [ ] Hide/restore changes all public surfaces and ratings consistently.
- [ ] Parent/child visibility behaves correctly across independent hide/restore operations.
- [ ] Merge keeps reviews, links, reports and shared URLs usable.
- [ ] Suspended accounts cannot use existing sessions to publish or engage.
