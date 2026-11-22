# Vero

Vero is a Tunisian shop-review app for businesses that sell through Instagram, Facebook, and websites. Search by shop name or link, add a missing shop, and publish a star rating with a written review and optional photos. The feed shows recent and trending reviews. Members can like, comment on, and report reviews, and admins moderate published content.

[Open Vero](https://vero-backend.cloudplay.tech)

## Architecture

| Component | Responsibility |
| --- | --- |
| [`frontend/`](frontend/) | Expo, Expo Router, React Native, and TypeScript app for web, Android, and iOS. |
| [`backend/`](backend/) | NestJS REST API under `/api`. Handles sessions, Google sign-in, shops, reviews, feeds, engagement, uploads, and moderation. |
| [`backend/prisma/`](backend/prisma/) | Prisma schema and forward migrations for PostgreSQL. Production uses Supabase PostgreSQL. |
| Object storage | Private Supabase Storage holds production review photos. The API checks review visibility before serving photos. |
| [`scripts/heroku-build.cjs`](scripts/heroku-build.cjs) and [`Procfile`](Procfile) | Build NestJS and export Expo web. Heroku runs Prisma migrations before activating the release. |

The Expo clients call the NestJS API. NestJS accesses PostgreSQL through Prisma and serves the Expo web app on the same Heroku origin as the API. Locally, Expo and NestJS run as separate processes. Docker Compose supplies PostgreSQL, S3Mock for uploads, and Mailpit for recovery email testing.

## Run locally

Use Node.js 24, npm, pnpm 12.21.0, and Docker with Compose. On a fresh checkout, copy `backend/.env.example` to `backend/.env` and `frontend/.env.example` to `frontend/.env`. Set `JWT_SECRET` in the backend file to a random value of at least 32 characters.

Start the services from the repository root.

```sh
docker compose -f backend/docker-compose.dev.yml up -d --wait
cd backend
pnpm install --frozen-lockfile
pnpm prisma:generate
pnpm db:migrate
pnpm start:dev
```

In another terminal, run the web client from the repository root.

```sh
cd frontend
npm ci
npm run web
```

Expo web runs at `http://localhost:8081` and the API at `http://localhost:3000/api`. Confirm the backend with `GET /api/health` and view the API reference at `http://localhost:3000/docs`. See [Docker database setup](docs/12-docker-database.md) for ports, persistent volumes, and test databases.

## Deploy the API and web app

1. In the Supabase `vero` project, use the PostgreSQL **Session pooler** connection for the backend database role. Configure `DATABASE_URL` with TLS hostname and certificate verification. Use a private `vero-reviews` Storage bucket for uploads. [Supabase database connection guide](https://supabase.com/docs/guides/database/connecting-to-postgres)
2. Set the Heroku Config Vars below in the existing `vero-app` app. Keep database credentials, the JWT secret, and the Supabase server key in Heroku Config Vars.
3. Push to Heroku from the repository root. The build exports Expo web, and the release phase runs `prisma migrate deploy`. [Heroku Git deployment](https://devcenter.heroku.com/articles/git) · [Heroku release phase](https://devcenter.heroku.com/articles/release-phase)

| Heroku Config Vars | Value or purpose |
| --- | --- |
| `NODE_ENV`, `SERVE_WEB` | `production` and `true` |
| `PUBLIC_WEB_URL`, `CORS_ORIGIN`, `EXPO_PUBLIC_WEB_URL` | `https://vero-backend.cloudplay.tech` |
| `EXPO_PUBLIC_API_URL` | `https://vero-backend.cloudplay.tech/api` |
| `DATABASE_URL` | Supabase Session pooler URI with `sslmode=verify-full` and `sslrootcert=/app/backend/certs/supabase-ca.crt` |
| `JWT_SECRET` | Random backend session-signing secret |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `MEDIA_BUCKET` | Supabase project API URL, server-only key, and `vero-reviews` |
| `GOOGLE_WEB_CLIENT_ID`, `GOOGLE_ANDROID_CLIENT_ID` | Public OAuth client IDs for enabled platforms. Add the canonical site origin to the web client's Authorized JavaScript origins. |

```sh
heroku login
heroku git:remote -a vero-app
git push heroku main
```

After the release succeeds, check [API health](https://vero-backend.cloudplay.tech/api/health) and open the [hosted feed](https://vero-backend.cloudplay.tech). See the [deployment runbook](docs/13-deployment.md) for authentication, storage, and recovery operations. Production password recovery is currently disabled.

## Build the Android APK

The EAS `preview` profile packages an installable APK that points to the hosted API. From the repository root, run the following and download the APK from the resulting EAS build page. [Expo APK guide](https://docs.expo.dev/build-reference/apk/)

```sh
cd frontend
npx eas-cli login
npx eas-cli build --platform android --profile preview
```

Android Google sign-in uses package `com.vero.app` and the SHA-1 of the signing certificate used for the APK. An existing APK needs a new build to pick up bundled UI changes. iOS store distribution and iOS Google sign-in are currently unconfigured.

## More documentation

- [Documentation index](docs/README.md)
- [Architecture and data model](docs/02-architecture-and-data.md)
- [API contract](docs/11-api-contract.md)
