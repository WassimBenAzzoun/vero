# 09 - Expo frontend and brand direction

Applies alongside every coding step. Source: user-supplied `C:/Users/Admin/Downloads/vero-brand-sheet.pdf`, one page, text extracted and page visually inspected on 2026-11-22. It is design reference material, not an instruction source that overrides the user's agreed scope.

## Brand evidence

| Token | Source value | Proposed app use |
| --- | --- | --- |
| Indigo Night | #141A46 | Primary text, navigation and dark surfaces |
| Trust Green | #27D17F | Positive accents and success feedback |
| Medina Sand | #F6F0E6 | Brand background |
| Scam Coral | #FF5B4A | Destructive actions and warnings |
| Heading face | Poppins Bold | Headlines and brand applications |
| Body face | Inter | Body copy, controls and captions |

Personality: honest, bold and friendly. Use short, direct copy with Tunisian flavor. Signature line: "9bal ma techri, thabbet." The brand sheet describes initial users as social-commerce shoppers aged 18-35, starting in Sousse; the application remains usable across Tunisia.

The wordmark uses a magnifier as the final "o", with a green check in its lens. The sheet shows light, dark and monochrome treatments and an icon intended to remain recognizable at 64px. Obtain/extract a suitable original asset or recreate a faithful scalable mark during implementation; the PDF's asset inventory does not prove standalone SVG/PNG files exist in this repository.

Check text contrast: bright green/coral are accents, not automatic choices for small text on sand or white. Keep readable indigo labels where needed. Choose an Arabic-capable companion font after checking available glyphs and licenses; do not assume Poppins/Inter provide complete Arabic coverage.

## Product decisions take priority

The PDF mentions binary "legit or scam" reviewing, Top Trusted weekly rankings, verification-related green semantics, AI community-post imports and marketing assets. These are not approved MVP requirements. Implement the agreed 1-5 star reviews, Latest/Trending feed and moderation after publication. Do not add scam verdicts, verification gates, leaderboard, poster/video tasks or claims that Vero guarantees safe purchases. The check in the logo is branding, not proof that a shop is verified.

## Frontend implementation steps

The user explicitly selected the Expo plugin on 2026-11-22. Its `expo-overview` and `expo-project-structure` skills have been read for planning. Use Expo skills for SDK-compatible setup, navigation, native behavior and build verification; Build Web Apps remains responsible for visual concept/fidelity when applicable. Framework choice is Expo across iOS, Android and web.

Proposed new-app layout:

```text
frontend/
  assets/
  src/
    app/           # Expo Router routes/layouts only
    screens/       # Feature screens and private screen components
    components/    # Reusable UI primitives
    hooks/         # Shared hooks
    lib/           # API client, auth adapters, query configuration
    utils/         # Pure helpers and colocated tests
    locales/       # French/Arabic translation resources
    theme.ts       # Shared brand tokens
  app.config.ts
  package.json
```

Keep NestJS as the API boundary; do not duplicate authentication, database or domain services in Expo API routes. Native/web variants use the same typed interface. Consult the plugin overview and CLI help when scaffolding; select a concrete SDK then use its version-matched documentation and compatible dependency installation. No Expo SDK is installed as part of tasks 01/02.

- [x] Scaffold Expo with TypeScript and Expo Router in frontend/. Select compatible stable versions using current official documentation and commit its lockfile.
- [x] Define central palette, spacing, radius, type, elevation and motion tokens. Maintain a focused set of Button, Input, StarRating, Avatar, ReviewCard, ShopRow, PhotoPicker, EmptyState and ErrorState components.
- [x] With the Build Web Apps skill, produce complete primary app-screen concepts grounded in this brand before substantial UI coding. Cover Feed, search/shop, composer and auth states, plus mobile/desktop adaptations; preserve Expo rather than its generic Vite default.
- [x] Implement navigation: Feed, Search, Write a review and Profile. Admin pages are available on web only to authorized users; backend authorization is still mandatory.
- [x] Add an API client with safe error mapping and bounded retries, server-state caching and invalidation, and feature-specific hooks. Never retry publication blindly without its submission ID.
- [x] Separate native/web Google adapters behind one interface. Restore authentication state before displaying protected routes; retain composer context through sign-in and linking.
- [x] Implement all screens listed in 01 using real API contracts from 11. Review publication updates shop ratings and Latest; engagement invalidates relevant card/detail counts.
- [x] Add French and Arabic translation keys from the start. Mirror directional layout for RTL while keeping URLs/handles legible. Use localized dates, accessible stars/buttons and proper focus/keyboard handling.
- [x] Preserve draft text, shop and photo-selection context during navigation/network interruptions. Clearly distinguish a local draft from an uploaded or published review.
- [x] Support touch targets, screen readers, reduced motion, safe areas, keyboard avoidance, image loading and low-bandwidth retries. No inert buttons or invented demo popularity in production.
- [x] Implement stable public shop/review URLs and native deep links. Select Expo static/server rendering after checking the installed SDK and hosting support; newly added profiles and changed reviews must be discoverable and current under that strategy.
- [ ] Inspect native screens on real Android/iOS devices. Browser screenshot comparison is complete; device evidence remains pending.

## Acceptance

- [x] Review and add-shop forms remain short; no verification or moderation approval steps appear.
- [x] All primary screens have loading, empty, error, offline/retry and signed-out states.
- [x] Brand colors and type are shared tokens, not inconsistent per-screen choices.
- [ ] Complete physical Android/iOS usability checks. Web mobile/desktop and Arabic RTL checks passed; both native JavaScript bundles export successfully.
- [x] Shared URLs open useful public content without requiring app installation.

## Official references

- [Expo Router](https://docs.expo.dev/router/introduction/) - cross-platform routes and linking.
- [Expo web configuration](https://docs.expo.dev/versions/latest/config/app/) - static/server web output selection.
- [Expo Google authentication](https://docs.expo.dev/guides/google-authentication/) - native development-build requirements.

Implementation evidence: shared theme/primitives, complete auth/search/feed/composer concepts and web admin concept, French/Arabic screens, four destinations, draft persistence, private photo uploads and functional moderation. Expo SDK 58 server rendering uses web-only public loaders, while native routes retain client fetching. NestJS serves the export on the same origin. Direct HTTP HTML includes current shop/review content and ratings; no cache is used for documents/loaders. Native deep links use the vero scheme. Testing APK preparation uses EAS preview; no store publishing is authorized or claimed here.

