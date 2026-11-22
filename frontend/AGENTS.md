# Vero Expo frontend

Read the repository root AGENTS.md and docs/README.md first. This app uses Expo SDK 58, React Native, TypeScript and Expo Router for Android, iOS and web. Use npm/npm ci here because the app has package-lock.json; backend uses its separate pnpm lockfile.

- Read the Expo plugin's expo-overview and applicable leaf skills before framework changes. Run Expo operations through `npx --yes @expo/agent-cli@latest`; read command help before first use. Install dependencies through its SDK-compatible install command.
- Check the installed SDK and matching versioned Expo docs. Do not upgrade the SDK as a side effect of a feature.
- Keep routes/layouts in src/app only; screens/components/lib stay outside it. Keep platform adapters extension-free at import sites and provide a default/native implementation plus web variant as needed.
- Read src/theme.ts and docs/design/ui-verification.md before visual changes. Preserve the Vero palette, typography and wordmark. Arabic uses its own font and RTL layouts; the wordmark remains LTR.
- Backend logic/database access stay in NestJS. EXPO_PUBLIC values are public and must never contain secrets, database URLs or session credentials.
- Google stays disabled with explanatory copy when configuration is absent, per the user. Enabled native Google requires a development build; do not advertise Expo Go support for that flow.
- Access tokens remain in memory; native refresh credentials use SecureStore; web uses an HttpOnly backend cookie. Align origin/CORS settings with deployment.
- Preserve drafts through authentication/network failures. Explicit logout/deletion clears user-associated drafts. Never fake publication; phase 06 owns review submission/photos.
- Every enabled control must work. Keep loading/error/empty states distinct; verify accessibility, keyboard, safe areas and RTL.
- Native directories are generated; configure app.config.ts/plugins instead of hand-authoring ios/android. Device builds/store delivery are separate from web export.
- Run npm run typecheck, npm run lint and relevant Expo export/browser/device checks. Report unverified native/provider flows; browser tests do not prove device behavior.
