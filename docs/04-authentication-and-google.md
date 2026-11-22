# 04 - Extend authentication and add Google

Depends on: 03. Reuse existing AuthModule, UsersModule, JwtAuthGuard, RolesGuard and DTO validation.

Status: implemented on 2026-11-22; local database/service and browser checks pass. The user explicitly deferred Google client IDs and requested a disabled button when unconfigured. Live Google and native-device verification remain pending external configuration/device access.

## Existing versus planned

Existing: register, login, GET/PATCH me, password change, bcrypt, JWT access tokens and active-user checks. Planned: Google, refresh/logout sessions, recovery, account deletion and frontend session handling. No email-verification gate is introduced.

## Backend steps

- [x] Adapt registration to USER. Normalize email consistently and return explicit safe DTOs from every auth response.
- [x] Add nullable passwordHash for Google-only accounts. Password login/change must handle its absence safely and never leak credential fields.
- [x] Add AuthIdentity with provider subject uniqueness. A Google account's stable `sub`, not its email or name, identifies the provider account.
- [x] Add POST /api/auth/google accepting an ID token. Verify signature, issuer, expiry and configured audience with Google's supported server library. Selected SDK ID-token flows do not request a custom nonce.
- [x] Resolve an existing Google identity or create a USER and identity transactionally. A new Google account returns a Vero session without an extra onboarding gate.
- [x] If a Google email collides with an existing local account, require authenticating that existing account before linking via POST /api/auth/google/link. Do not silently attach it by matching email. Handle concurrent sign-ins via unique constraints.
- [x] Issue Vero access/refresh sessions from both login methods. Store only hashed refresh tokens, rotate on refresh, reject reuse, and revoke sessions on logout, recovery, suspension or account deletion as appropriate.
- [x] Add POST refresh/logout, POST forgot-password/reset-password and DELETE me. Recovery responses are generic; reset tokens are hashed, expiring and single-use. Google-only accounts receive the same generic recovery response without creating a local password.
- [x] Keep inactive-account checks for every authentication method and protected request.

## Expo and web steps

- [x] Scaffold Expo Router and preserve the interrupted shop/review draft through authentication.
- [x] Select the supported native Google library and conditional plugin; enabled native Google requires a development build. Missing configuration stays disabled, including in Expo Go.
- [ ] Configure Android package name and signing fingerprints, iOS bundle identifier/URL configuration, and the required Google Cloud clients. Keep development and production configuration explicit.
- [x] Implement web Google Identity Services behind a platform adapter; browser origin checks and credentialed CORS protect cookie delivery. Provider-console origins are deferred with the client IDs.
- [x] Send the resulting ID token to NestJS, then use returned Vero sessions. Use HTTPS for deployed API URLs; local development uses localhost HTTP.
- [x] Native uses SecureStore; web uses HttpOnly cookies (Secure in production), SameSite=Lax and explicit browser origin validation. Access tokens stay in memory. Deploy frontend/backend on the same site or configure an appropriate cross-site cookie strategy before releasing web across unrelated domains.
- [x] Implement cancellation/error/session/linking/logout states and preserve drafts through sign-in; explicit logout/account deletion clears user-associated drafts.

## Configuration

Document selected SDK versions and exact client-ID mapping at implementation time. Proposed names: GOOGLE_WEB_CLIENT_ID, GOOGLE_ANDROID_CLIENT_ID, GOOGLE_IOS_CLIENT_ID, GOOGLE_ALLOWED_AUDIENCES and public Expo client-ID counterparts where needed. Client IDs are public; client secrets, JWT secrets and refresh tokens never belong in EXPO_PUBLIC values. This ID-token design does not require shipping a Google client secret to the app or introducing Firebase authentication.

External setup needed for real verification: access to a Google Cloud project, registered app identifiers/origins and development/release signing information. Continue other implementation with mocked provider verification in automated tests when these are unavailable; do not claim real Google login passed.

## Acceptance

- [x] Existing email/password users can still sign in.
- [ ] Google sign-in works on Android, iOS and web, including cancellation and returning-user cases.
- [x] Invalid credentials are rejected through Google's official verifier; unit tests cover its verification-failure boundary. Live provider verification is pending configuration.
- [x] Email collisions cannot take over existing accounts; linking requires existing-account authentication.
- [x] Refresh rotation, logout and suspension pass local integration tests for password and mocked-provider accounts.
- [x] Email/password sign-in returns to the draft in browser tests. Google uses the same return path, but its live flow remains unverified and disabled without IDs.

## Verification evidence

Backend build/lint and 13 unit tests passed. Docker integration tests cover subject-based Google resolution with a mocked verifier, collisions/linking, concurrent Google signup, token rotation/reuse/expiry/logout, single-use recovery, account deletion and inactive users. Browser tests exercised real cookie sessions, registration/reload/logout, local Mailpit delivery/reset, draft retention and French/Arabic at mobile/desktop widths. See [UI evidence](design/ui-verification.md).

Local Mailpit runs at http://localhost:8025 with SMTP on 1025. Production SMTP is separate and is never replaced with a localhost endpoint on Heroku. Access tokens created before this phase have no session ID and must sign in again. The account-deletion workflow rejects ADMIN accounts until access is transferred; ordinary account deletion anonymizes profile fields and removes public content.

## Official references

- [Expo Google authentication](https://docs.expo.dev/guides/google-authentication/) - native integration and development builds.
- [Google backend authentication](https://developers.google.com/identity/sign-in/web/backend-auth) - ID-token verification and stable user identity.
- [Google Identity Services setup](https://developers.google.com/identity/gsi/web/guides/get-google-api-clientid) - web client and origin setup.

Recheck these references against installed versions before coding.

Configuration update: public web/Android IDs imported from the supplied files; package com.vero.app confirmed. User confirmed the production web origin was added in Google Cloud. iOS Google stays unconfigured. Live Google sign-in and Android signing SHA matching still require verification.


Profile correction: GET /auth/me/security exposes only hasPassword/googleLinked booleans. Google-only profiles hide password change/link controls and use Google reauthentication for deletion; password accounts retain their password controls. Real database auth scenarios and browser session-fixture regressions verify both account types. Credential fields remain private.

