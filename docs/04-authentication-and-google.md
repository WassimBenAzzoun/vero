# 04 - Extend authentication and add Google

Depends on: 03. Reuse existing AuthModule, UsersModule, JwtAuthGuard, RolesGuard and DTO validation.

## Existing versus planned

Existing: register, login, GET/PATCH me, password change, bcrypt, JWT access tokens and active-user checks. Planned: Google, refresh/logout sessions, recovery, account deletion and frontend session handling. No email-verification gate is introduced.

## Backend steps

- [ ] Adapt registration to USER. Normalize email consistently and return explicit safe DTOs from every auth response.
- [ ] Add nullable passwordHash for Google-only accounts. Password login/change must handle its absence safely and never leak credential fields.
- [ ] Add AuthIdentity with provider subject uniqueness. A Google account's stable `sub`, not its email or name, identifies the provider account.
- [ ] Add POST /api/auth/google accepting an ID token. Verify signature, issuer, expiry and configured audience with Google's supported server library; check nonce when the selected client flow uses one.
- [ ] Resolve an existing Google identity or create a USER and identity transactionally. A new Google account returns a Vero session without an extra onboarding gate.
- [ ] If a Google email collides with an existing local account, require authenticating that existing account before linking via POST /api/auth/google/link. Do not silently attach it by matching email. Handle concurrent sign-ins via unique constraints.
- [ ] Issue Vero access/refresh sessions from both login methods. Store only hashed refresh tokens, rotate on refresh, reject reuse, and revoke sessions on logout, recovery, suspension or account deletion as appropriate.
- [ ] Add POST refresh/logout, POST forgot-password/reset-password and DELETE me. Recovery responses are generic; reset tokens are hashed, expiring and single-use. Decide a clear Google-only recovery message without revealing account existence publicly.
- [ ] Keep inactive-account checks for every authentication method and protected request.

## Expo and web steps

- [ ] Scaffold Expo Router and preserve the interrupted shop/review draft through authentication.
- [ ] On native, select a currently supported Google library from the Expo guide, configure its plugin and use a development build. Do not promise native Google testing in Expo Go.
- [ ] Configure Android package name and signing fingerprints, iOS bundle identifier/URL configuration, and the required Google Cloud clients. Keep development and production configuration explicit.
- [ ] On web, use Google Identity Services behind a platform adapter rather than importing native-only code into the web bundle. Configure allowed origins and credential delivery/CSRF protection for the chosen mode.
- [ ] Send the resulting ID token to NestJS over HTTPS, then use the returned Vero session for API requests. Do not use Google access tokens as Vero API sessions.
- [ ] Native refresh tokens use secure device storage; web refresh sessions use HttpOnly Secure cookies with an explicit SameSite/CSRF strategy matching deployment origins. Keep web access tokens in memory, configure credentialed CORS, and never persist long-lived tokens in localStorage.
- [ ] Handle user cancellation, unavailable provider/network, expired tokens, local-account linking, and logout without losing drafts.

## Configuration

Document selected SDK versions and exact client-ID mapping at implementation time. Proposed names: GOOGLE_WEB_CLIENT_ID, GOOGLE_ANDROID_CLIENT_ID, GOOGLE_IOS_CLIENT_ID, GOOGLE_ALLOWED_AUDIENCES and public Expo client-ID counterparts where needed. Client IDs are public; client secrets, JWT secrets and refresh tokens never belong in EXPO_PUBLIC values. This ID-token design does not require shipping a Google client secret to the app or introducing Firebase authentication.

External setup needed for real verification: access to a Google Cloud project, registered app identifiers/origins and development/release signing information. Continue other implementation with mocked provider verification in automated tests when these are unavailable; do not claim real Google login passed.

## Acceptance

- [ ] Existing email/password users can still sign in.
- [ ] Google sign-in works on Android, iOS and web, including cancellation and returning-user cases.
- [ ] Invalid/expired/wrong-audience tokens and forged user emails are rejected.
- [ ] Email collisions cannot take over existing accounts; linking requires existing-account authentication.
- [ ] Refresh rotation, logout and suspension work for both login methods.
- [ ] Both login methods return users to their draft and permit immediate reviewing.

## Official references

- [Expo Google authentication](https://docs.expo.dev/guides/google-authentication/) - native integration and development builds.
- [Google backend authentication](https://developers.google.com/identity/sign-in/web/backend-auth) - ID-token verification and stable user identity.
- [Google Identity Services setup](https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid) - web client and origin setup.

Recheck these references against installed versions before coding.
