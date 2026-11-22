# Proposed REST API contract

Planning reference; routes beyond the existing auth/users/health baseline are not implemented yet. Base path: `/api`. UUID identifiers, UTC ISO timestamps and explicit safe response DTOs.

| Method | Route | Access / behavior |
| --- | --- | --- |
| POST | /auth/register, /auth/login | Public; existing flows adapted to USER |
| POST | /auth/google | Public; verify Google ID token and issue Vero session |
| POST | /auth/google/link | Authenticated; require recent authentication before linking |
| POST | /auth/refresh, /auth/logout | Refresh-session credential; rotate/revoke |
| POST | /auth/forgot-password, /auth/reset-password | Public; generic request response, validated reset token |
| GET/PATCH/DELETE | /auth/me | Current user profile/update/account deletion |
| PATCH | /auth/me/password | Current user; existing password required |
| GET | /shops?q=&cursor=&limit= | Public name/handle/link search |
| POST | /shops | Authenticated; name and links; duplicate returns existing shop |
| GET | /shops/:id | Public active shop, links, rating summary |
| GET | /shops/:id/reviews?stars=&hasPhotos=&cursor=&limit= | Public visible reviews |
| POST | /shops/:id/reviews | Authenticated; rating/text, optional product/date/media IDs |
| GET | /reviews/:id | Public visible review |
| PATCH/DELETE | /reviews/:id | Author only |
| POST | /media/uploads | Authenticated upload intent with bounded metadata |
| POST | /media/uploads/:id/complete | Owner; server validates stored bytes before readiness |
| GET | /media/:id | Public only if attached to visible content; authorized media delivery |
| GET | /feed?sort=latest\|trending&cursor=&limit= | Public review cards; snapshot cursor for Trending |
| PUT/DELETE | /reviews/:id/like | Authenticated; idempotent |
| GET/POST | /reviews/:id/comments | Public read / authenticated create |
| PATCH/DELETE | /comments/:id | Comment author only |
| POST | /reports | Authenticated; one target and reason |
| GET | /admin/reports, /admin/reviews, /admin/comments, /admin/shops, /admin/users | ADMIN; paginated management views |
| POST | /admin/reviews/:id/hide, /admin/reviews/:id/restore | ADMIN; reason and audit |
| POST | /admin/comments/:id/hide, /admin/comments/:id/restore | ADMIN; reason and audit |
| PATCH | /admin/shops/:id | ADMIN; correct profile/links |
| POST | /admin/shops/:id/hide, /admin/shops/:id/restore | ADMIN; reason and audit |
| POST | /admin/shops/:id/merge | ADMIN; targetShopId, reason, transactional redirect |
| POST | /admin/users/:id/suspend, /admin/users/:id/reactivate | ADMIN; session/account policy |
| PATCH | /admin/reports/:id | ADMIN; resolve/dismiss with reason |

## Conventions

- Lists return `{ items, nextCursor }`; proposed default limit 20 and maximum 50. Sort/filter settings are encoded in or validated against the cursor. Trending cursor also carries a ranking snapshot reference.
- Review cards include a safe author summary, shop summary, rating/text/product/date, photo references and engagement counts. Authenticated reads may add viewer-specific state via a deliberately implemented optional-auth guard; current @Public bypasses JWT parsing.
- Mutations infer actor from authentication. Reject unknown fields and never accept arbitrary author IDs, roles, visibility or rating counters from clients.
- Use a consistent documented error shape with a stable code, readable message and optional field errors. Hidden/missing public resources share a non-disclosing not-found response.
- For shop creation, document 201 for new versus 200 for existing identity matches. Idempotency keys distinguish a retried review request from a deliberate second review.
- Media flow: create intent -> upload -> server validates completion -> attach ready media ID when publishing. Storage-provider upload details stay behind the service interface.
- Final DTOs/status codes are settled during implementation and kept in Swagger; frontend types must track them rather than duplicating incompatible assumptions.
