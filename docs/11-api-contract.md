# Implemented REST API contract

Runtime reference after tasks 03-09. Base path: `/api`. UUID identifiers, UTC ISO timestamps and safe response selections. Swagger at `/docs` is the detailed DTO reference.

| Method | Route | Access / behavior |
| --- | --- | --- |
| POST | /auth/register, /auth/login | Public; existing flows adapted to USER |
| POST | /auth/google | Public; verify Google ID token and issue Vero session |
| POST | /auth/google/link | Authenticated; require recent authentication before linking |
| POST | /auth/refresh, /auth/logout | Refresh-session credential; rotate/revoke |
| POST | /auth/forgot-password, /auth/reset-password | Public; generic request response, validated reset token |
| GET/PATCH/DELETE | /auth/me | Current user profile/update/account deletion |
| GET | /auth/config | Public provider/recovery availability and public Google web ID |
| GET | /auth/me/security | Current user; hasPassword/googleLinked booleans, no credentials |
| PATCH | /auth/me/password | Current user; existing password required |
| GET | /shops?q=&cursor=&limit= | Public name/handle/link search |
| POST | /shops | Authenticated; name and links; duplicate returns existing shop |
| GET | /shops/:id | Public active shop, links, rating summary |
| GET | /shops/:id/reviews?stars=&hasPhotos=&cursor=&limit= | Public visible reviews |
| POST | /shops/:id/reviews | Authenticated; rating/text, optional product/date/media IDs |
| GET | /reviews/:id | Public visible review |
| PATCH/DELETE | /reviews/:id | Author only |
| GET | /my/reviews | Current author's reviews, including moderation status |
| POST | /media/uploads | Authenticated upload intent with bounded metadata |
| PUT | /media/uploads/:id/content | Owner; multipart file, actual byte checks, JPEG normalization and thumbnails |
| POST | /media/uploads/:id/complete | Owner; confirm ready, unexpired asset |
| GET | /media/config | Public upload availability and caps |
| GET | /media/:id | Public only if attached to visible content; authorized media delivery |
| GET | /feed?sort=latest\|trending&cursor=&limit= | Public review cards; snapshot cursor for Trending |
| PUT/DELETE | /reviews/:id/like | Authenticated; idempotent |
| GET/POST | /reviews/:id/comments | Public read / authenticated create |
| PATCH/DELETE | /comments/:id | Comment author only |
| POST | /reports | Authenticated; one target and reason |
| GET | /admin/reports, /admin/reviews, /admin/comments, /admin/shops, /admin/members, /admin/history | ADMIN; cursor-paginated management views |
| POST | /admin/:kind/:id/actions | ADMIN; kind reviews/comments/shops with hide/restore, members with suspend/reactivate, reports with resolve/dismiss; reason required and audited |
| PATCH | /admin/shops/:id | ADMIN; correct profile/links |
| POST | /admin/shops/:id/merge | ADMIN; targetId, reason, transactional redirect |

## Conventions

- New lists return `{ items, nextCursor }`; default limit 20 and maximum 50. The pre-existing ADMIN `/users` endpoint retains its page/meta contract. Sort/filter settings are validated against cursors. Trending cursors carry a five-minute ranking snapshot reference (500 recent candidates).
- Review cards include a safe author summary, shop summary, rating/text/product/date, photo references and engagement counts. Authenticated reads may add viewer-specific state via a deliberately implemented optional-auth guard; current @Public bypasses JWT parsing.
- Mutations infer actor from authentication. Reject unknown fields and never accept arbitrary author IDs, roles, visibility or rating counters from clients.
- Use a consistent documented error shape with a stable code, readable message and optional field errors. Hidden/missing public resources share a non-disclosing not-found response.
- For shop creation, document 201 for new versus 200 for existing identity matches. Idempotency keys distinguish a retried review request from a deliberate second review.
- Media flow: create intent -> upload/validate/normalize -> confirm readiness -> attach ready media ID when publishing. Storage-provider details stay behind the service interface. Public byte delivery checks current review/shop visibility and uses no-store.
- Final DTOs/status codes are settled during implementation and kept in Swagger; frontend types must track them rather than duplicating incompatible assumptions.

Outside `/api`, Expo serves the app pages; `/sitemap.xml` lists visible shop/review URLs and `/robots.txt` excludes private account/admin paths. Reports use `{ targetType: 'review'|'comment'|'shop', targetId, reason, details? }` and never change content visibility by themselves.
