# Vero Expo app

Expo SDK 58, React Native, Expo Router and TypeScript. One application targets Android, iOS and web. Backend API lives in `../backend`; it is not duplicated in Expo API routes.

## Run locally

```powershell
npm ci
npx --yes @expo/agent-cli@latest start --web --port 8081
```

Start PostgreSQL/Mailpit through the repository Docker Compose file and start the NestJS backend from its own directory. Set EXPO_PUBLIC_API_URL in an ignored `.env` if needed; default is http://localhost:3000/api. On a physical device, use the computer's reachable LAN API address. Never put a database URL, Google secret or JWT secret in public frontend variables.

## Google configuration

As requested, Google sign-in stays disabled with an explanation until backend OAuth client IDs are supplied. Web gets its public client ID from GET /api/auth/config and uses Google Identity Services. Native loads the Google SDK only after configuration is available, so the disabled state works without a native Google module in Expo Go.

For enabled native Google login, use a development build. Configure backend GOOGLE_WEB_CLIENT_ID/allowed audiences, Android signing fingerprints, and iOS EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID plus EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME. Rebuild after changing plugins. The provisional app identifier is com.vero.app; finalize it before store builds. No Google credentials or EAS project are invented.

## Sessions and drafts

Access tokens remain in memory. Native refresh credentials use SecureStore; web uses an HttpOnly cookie from NestJS and credentialed requests. Refresh calls are serialized. Backend origin validation protects browser refresh/login/logout. Configure its CORS_ORIGIN list to the actual frontend origin.

Review text, selected shop and pending shop input live in a separate local draft. Login/recovery navigation preserves it. Explicit logout/account deletion clears it. No receipt or verification step is introduced. Review publication and photos are phase 06; the composer currently preserves a draft without pretending to publish it.

## Verification

```powershell
npm run typecheck
npm run lint
npx --yes @expo/agent-cli@latest export --platform web
```

Browser verification uses Playwright with an isolated browser context and the real local API. Native Google and real-device behavior still need configured client IDs and device/development builds; browser testing is not proof of those flows.
