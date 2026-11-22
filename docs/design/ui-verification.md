# Auth and search UI verification

Reference concept: [auth-search-concept.png](auth-search-concept.png), generated with the built-in image generation tool on 2026-11-22. Brief: complete readable mobile sign-in/search screens for Vero using sand #F6F0E6, indigo #141A46, green #27D17F, coral #FF5B4A, Poppins/Inter, the magnifier wordmark, French copy, concise forms, shop result rows and no verification gate. The source generation prompt is in this chat's image-generation call.

## Design system

Implementation tokens live in frontend/src/theme.ts. Use sand page backgrounds, white inputs, indigo actions/text, green accent lines, 12-13px rounded controls, 24px mobile page gutters, 52px buttons and shared form primitives. Font files load locally and only the four used weights/families are bundled. Noto Sans Arabic complements Inter/Poppins for Arabic. The wordmark has its own LTR layout even inside RTL screens.

## Auth pass

Playwright Chromium through installed Edge was used because Browser/IAB tools were unavailable in this session. Inspected viewports: 390x844 and 1440x1000; screenshots and the original concept were opened with view_image. Temporary screenshots live under ignored tmp/qa during verification.

| Comparison | Evidence / result |
| --- | --- |
| Palette | Exact sand, indigo and green tokens match the reference; no added background gradient |
| Typography | Poppins title and Inter controls/body are loaded; Arabic uses Noto Sans Arabic |
| Layout | Brand, green line, heading, email/password form, main action and secondary account link preserve the reference hierarchy |
| Controls | White bordered inputs, shared 52px button and password visibility control; disabled/pending states are explicit |
| Brand/RTL | Magnifier/check wordmark retained; detected reversed RTL wordmark was fixed with an isolated LTR brand layout |
| Responsive behavior | Centered bounded column on desktop, full-width mobile controls, no horizontal overflow in Arabic |

Intentional differences: user requested Google disabled until configured, so the Google action is muted with explanatory copy instead of showing an enabled branded button. Language selection and Back action extend the sign-in reference to support the agreed app navigation. Mobile implementation scales the reference's oversized board typography into an accessible 390px layout. Native navigation/system chrome is not represented by a browser screenshot.

Copy check: required French headings, field labels and actions are retained. Added copy is limited to required validation, provider-disabled, recovery and navigation states; no new trust claims or verification badges.

Functional checks passed: disabled Google, registration, HttpOnly cookie restore after reload, logout, email captured in local Mailpit, password reset, draft retention through sign-in and Arabic layout. No live Google account, iOS device or Android device has been tested yet. Native verification remains explicitly pending.

## Feed, composer and administration

References: feed-compose-concept.png and admin-concept.png. Rendered screenshots were inspected at 390x844 and 1440x1000. Sand/indigo/green palette, Poppins/Inter/Arabic fonts, mobile gutters, open review rows, shop/stars/photo form and four destinations follow the concepts. Admin uses a wide side-navigation, list and decision panel. Every visible action connects to the API. Intentional changes: readable text action labels replace several concept icons; dates use explicit YYYY-MM-DD input; administration uses adaptable rows rather than a dense table. Native system chrome/device behavior remains unverified. A whitespace text-node warning found during screenshot inspection was corrected. The production-style photo flow caught and verified a data/blob CSP fix.

