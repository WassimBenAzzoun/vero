# Local PostgreSQL with Docker

The user selected Docker for the database. Use Docker Desktop/Engine with Compose; no host PostgreSQL installation is required. Run NestJS on the host initially. PostgreSQL remains version 16, matching the boilerplate.

## Start and inspect

From the repository root:

```powershell
docker compose -f backend/docker-compose.dev.yml config --quiet
docker compose -f backend/docker-compose.dev.yml up -d --wait
docker compose -f backend/docker-compose.dev.yml ps
docker compose -f backend/docker-compose.dev.yml exec -T postgres psql -U vero -d vero -c "SELECT current_database(), current_user, version();"
```

Connection defaults are development-only: database/user/password `vero`, host `127.0.0.1`, port `5433`. The port is bound to loopback so it is not exposed to the local network. Override POSTGRES_USER, POSTGRES_PASSWORD, POSTGRES_DB and POSTGRES_PORT if needed and update DATABASE_URL to match. URL-encode special characters in connection credentials.

The backend example uses:

```dotenv
DATABASE_URL="postgresql://vero:vero@127.0.0.1:5433/vero?schema=public"
```

Create `backend/.env` from its example only if it does not already exist, then set a real local JWT secret. Do not overwrite another developer's configuration. The root .gitignore excludes environment files.

If the backend later runs inside Compose, connect to service hostname `postgres` and container port `5432`, not localhost or host port 5433. The Expo client never connects directly to PostgreSQL.

## Persistence and shutdown

The named `vero_postgres_data` volume survives container recreation and `docker compose down`. Stop without removing data:

```powershell
docker compose -f backend/docker-compose.dev.yml stop
```

Do not use `down -v`, volume removal, Prisma reset or reinitialize the database as routine setup. POSTGRES_* initialization variables initialize a new volume; changing them does not migrate existing users, credentials or database names. Preserve any older CloudOps volume and migrate/export deliberately.

## Schema and tests

Starting this container creates an empty database, not the Vero application schema. Task 03 applies forward Prisma migrations; existing historical migrations still create CloudOps tables until that transition is implemented. Seed only after inspecting/updating the seed for Vero.

Integration tests must use an isolated test database, connection URL and volume/project configuration. Do not run destructive tests against the development database or reuse it as the e2e reset target.

## Troubleshooting

- Engine unavailable: start Docker Desktop and rerun `docker version`.
- Port busy: choose another POSTGRES_PORT and match DATABASE_URL.
- Container unhealthy: inspect `docker compose -f backend/docker-compose.dev.yml logs postgres`; check initialization variables against the existing volume before changing anything.
- Prisma cannot connect: distinguish the host endpoint `127.0.0.1:5433` from container endpoint `postgres:5432` and verify the intended database credentials.

## Verification recorded on 2026-11-22

- Compose configuration validation passed and `up -d --wait` reached healthy status.
- Authenticated TCP SQL inside the container returned database `vero`, user `vero` and PostgreSQL 16.16.
- Published port inspection returned `127.0.0.1:5433`; a host TCP connection succeeded.
- No existing containers/volumes were present before setup. Created `vero_postgres_data`; no volume was removed and no application migration or seed was executed.
- Persistence is configured with a named volume; backup restoration and application integration are not verified by these startup checks.

## Official references

- [Docker Compose health checks](https://docs.docker.com/compose/how-tos/startup-order/) explains database readiness checks.
- [Docker PostgreSQL guide](https://docs.docker.com/guides/postgresql/) explains container networking and persistent storage. The data-directory mount in this project is chosen for PostgreSQL 16.
