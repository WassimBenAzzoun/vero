# CloudOps Manager — Backend

Backend API for **CloudOps Manager**, built with NestJS, TypeScript, Prisma ORM, and PostgreSQL.

---

## 1. Technology Stack

| Technology     | Version                           |
| -------------- | --------------------------------- |
| Node.js        | 24.16.0 (development environment) |
| pnpm           | Package manager                   |
| NestJS         | 11.x                              |
| TypeScript     | 6.x                               |
| Prisma ORM     | 7.x                               |
| PostgreSQL     | 16                                |
| Docker         | Required for local PostgreSQL     |
| Docker Compose | Required for local PostgreSQL     |
| Swagger        | 12.x                              |
| RxJS           | 7.x                               |
| tsx            | Required to exec seed script      |
| bcrypt         | Required for Password Hashing     |

### Main dependencies

- `@nestjs/config` — Environment configuration.
- `@nestjs/jwt` — JWT authentication.
- `@nestjs/swagger` — API documentation.
- `@nestjs/terminus` — Health checks.
- `@nestjs/throttler` — Rate limiting.
- `@nestjs/event-emitter` — Event-driven functionality.
- `@nestjs/schedule` — Scheduled tasks.
- `@prisma/client` — Database client.
- `@prisma/adapter-pg` — PostgreSQL adapter.
- `class-validator` — DTO validation.
- `class-transformer` — Data transformation.
- `helmet` — HTTP security headers.
- `bcrypt` — Password hashing.

---

## 2. Prerequisites

Install the following before setting up the project:

- Node.js 24.x
- pnpm
- Docker Engine
- Docker Compose plugin

Verify the installations:

```bash
node -v
pnpm -v
docker --version
docker compose version
```

The development environment used Node.js `v24.16.0`.

---

## 3. Clone the Repository

```bash
git clone https://github.com/NestCloudOps/cloudops-backend.git

cd cloudops-backend
```

---

## 4. Install Dependencies

Install project dependencies:

```bash
pnpm install
```

If pnpm requests approval for dependency build scripts:

```bash
pnpm approve-builds
```

Review the packages before approving their build scripts.

---

## 5. Environment Configuration

Create your local environment file:

```bash
cp .env.example .env
```

Configure the following variables:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/cloudops?schema=public"

JWT_SECRET="replace_with_a_random_secret_at_least_32_characters"

JWT_EXPIRES_IN="15m"

PORT=3000

CORS_ORIGIN="http://localhost:3001"

NODE_ENV="development"
```

### Environment variables

| Variable               | Description                             |
| ---------------------- | --------------------------------------- |
| `DATABASE_URL`         | PostgreSQL connection string            |
| `JWT_SECRET`           | Secret used to sign and verify JWTs     |
| `JWT_EXPIRES_IN`       | JWT expiration duration                 |
| `PORT`                 | Backend application port                |
| `CORS_ORIGIN`          | Allowed frontend origin                 |
| `NODE_ENV`             | Application environment                 |
| `SEED_ADMIN_PASSWORD`  | Development admin account password      |
| `SEED_DEVOPS_PASSWORD` | Development DevOps account password     |
| `SEED_VIEWER_PASSWORD` | Development viewer account password     |
| `THROTTLE_TTL`         | Rate-limiting time window in ms         |
| `THROTTLE_LIMIT`       | Max global reqs allower per time window |

Generate a secure JWT secret instead of using the example value:

```bash
openssl rand -base64 48
```

Replace the placeholder in `.env` with the generated value.

**Important:**

- `JWT_SECRET` must contain at least 32 characters.
- Never commit `.env` to Git.
- `.env.example` contains configuration templates, not production secrets.
- Adjust `CORS_ORIGIN` to match your frontend URL.

---

## 6. PostgreSQL Setup with Docker

The project uses PostgreSQL 16 through Docker Compose for local development.

### Start PostgreSQL

```bash
docker compose -f docker-compose.dev.yml up -d
```

### Check container status

```bash
docker ps
```

Or:

```bash
docker compose -f docker-compose.dev.yml ps
```

Wait until the PostgreSQL container reports a healthy status.

### Database configuration

| Setting        | Value                    |
| -------------- | ------------------------ |
| Image          | `postgres:16`            |
| Container name | `cloudops-postgres`      |
| Database       | `cloudops`               |
| Username       | `postgres`               |
| Password       | `postgres`               |
| Container port | `5432`                   |
| Host port      | `5433`                   |
| Volume         | `cloudops_postgres_data` |

The host uses port `5433` because port `5432` was already occupied.

The database connection string is:

```text
postgresql://postgres:postgres@localhost:5433/cloudops?schema=public
```

### Stop PostgreSQL

```bash
docker compose -f docker-compose.dev.yml down
```

### Stop PostgreSQL and delete its persistent data

```bash
docker compose -f docker-compose.dev.yml down -v
```

**Warning:** The `-v` option deletes the database volume and its stored data. Use it only when you intentionally want to reset the development database.

---

## 7. Prisma Setup

Prisma is used as the ORM and PostgreSQL database access layer.

### Validate the Prisma schema

```bash
pnpm prisma validate
```

### Generate Prisma Client

```bash
pnpm prisma:generate
```

Alternatively:

```bash
pnpm exec prisma generate
```

### Run database migrations

For the initial database migration:

```bash
pnpm exec prisma migrate dev --name init_full_schema
```

For subsequent schema changes, use a descriptive migration name:

```bash
pnpm exec prisma migrate dev --name migration_name
```

### Reset Database

```bash
pnpm db:reset
```

### Open Prisma Studio

```bash
pnpm prisma:studio
```

Prisma Studio provides a graphical interface for inspecting and managing database records.

---

## 8. Development

Start the application in development mode:

```bash
pnpm start:dev
```

NestJS watches source files and recompiles when changes are detected.

The API should be accessible at:

```text
http://localhost:3000/api
```

Stop the development server with:

```text
Ctrl + C
```

### Available commands

| Command            | Description                             |
| ------------------ | --------------------------------------- |
| `pnpm start`       | Start NestJS                            |
| `pnpm start:dev`   | Start in watch mode                     |
| `pnpm start:debug` | Start with debugging                    |
| `pnpm build`       | Compile the application                 |
| `pnpm start:prod`  | Run the production build                |
| `pnpm lint`        | Run Oxlint                              |
| `pnpm format`      | Format TypeScript source and test files |

---

## 9. Build and Production Startup

Build the application:

```bash
pnpm build
```

The compiled application is expected to be generated in:

```text
dist/
```

The expected entry point is:

```text
dist/main.js
```

Start the compiled application:

```bash
pnpm start:prod
```

Before deploying to production:

- Use production-grade database credentials.
- Never use the development PostgreSQL password.
- Configure secure JWT secrets.
- Set `NODE_ENV=production`.
- Configure the correct CORS origin.
- Use HTTPS.
- Apply database migrations through the deployment process.
- Do not expose PostgreSQL publicly unless explicitly required and properly secured.

---

## 10. API Documentation

Swagger documentation is available after starting the application.

**Swagger UI:**

```text
http://localhost:3000/docs
```

**OpenAPI JSON:**

```text
http://localhost:3000/docs-json
```

The API documentation supports Bearer JWT authentication.

---

## 11. Health Check

The application exposes a health-check endpoint:

```text
GET http://localhost:3000/api/health
```

The endpoint checks:

- Application memory usage.
- Database connectivity.

It is intended to help verify application and database availability.

---

---

## 11. Authentication and Authorization

The API uses JSON Web Tokens (JWT) for authentication and role-based
access control.

## Authentication

Include a JWT access token in the `Authorization` header when accessing protected endpoints.

**Example:**

```http
Authorization: Bearer <access_token>
```

### Authentication Endpoints

| Method | Endpoint                | Description                         | Access        |
| ------ | ----------------------- | ----------------------------------- | ------------- |
| POST   | `/api/auth/register`    | Register a new account              | Public        |
| POST   | `/api/auth/login`       | Authenticate and obtain a JWT       | Public        |
| GET    | `/api/auth/me`          | Retrieve the current user's profile | Authenticated |
| PATCH  | `/api/auth/me`          | Update the current user's profile   | Authenticated |
| PATCH  | `/api/auth/me/password` | Change the current user's password  | Authenticated |

### User Roles

The application supports three roles:

| Role   | Description                                       |
| ------ | ------------------------------------------------- |
| ADMIN  | Full administrative access                        |
| DEVOPS | Operational access to projects and infrastructure |
| VIEWER | Read-only access to permitted resources           |

**Important:**

- Public registration always assigns the `VIEWER` role.
- Users cannot assign themselves administrative privileges through the registration endpoint.

### Authorization

The application uses two guards to manage access control:

- **`JwtAuthGuard`**: Verifies JWT tokens and identifies the authenticated user.
- **`RolesGuard`**: Checks whether the authenticated user's role is permitted to access the requested endpoint.

Protected endpoints require a valid JWT unless explicitly marked as public.

### Security Features

- Passwords are hashed using **bcrypt**.
- Passwords must contain at least 8 characters, including at least one letter and one digit.
- JWT tokens have a configurable expiration time.
- Inactive accounts cannot authenticate.
- Login errors use a generic `"Invalid credentials"` response to prevent user enumeration.
- Login attempts are limited to **5 requests per minute per IP**.
- Global API requests are limited to **100 requests per minute**.
- Users cannot deactivate or demote their own `ADMIN` account.

## 12. User Management

User management is available through the Users module.

All user-management endpoints require authentication and the `ADMIN` role.

### User Management Endpoints

| Method | Endpoint         | Description                        | Access |
| ------ | ---------------- | ---------------------------------- | ------ |
| GET    | `/api/users`     | Retrieve a paginated list of users | ADMIN  |
| GET    | `/api/users/:id` | Retrieve a user by ID              | ADMIN  |
| POST   | `/api/users`     | Create a user                      | ADMIN  |
| PATCH  | `/api/users/:id` | Update user information            | ADMIN  |
| DELETE | `/api/users/:id` | Deactivate a user                  | ADMIN  |

### User Listing Features

The users endpoint supports:

- Pagination.
- Search by email or full name.
- Filtering by role.
- Filtering by account activation status.
- Sorting by supported user fields.

### Account Deactivation

Deleting a user does not permanently remove their database record.

Instead, the account is soft-deactivated by setting `isActive` to `false`.

Inactive users cannot authenticate.

## 13. Testing

The backend uses Jest for unit testing.

Unit tests verify authentication business logic and role-based authorization.

### Run Unit Tests

```bash
pnpm test --runInBand
```

### Run Tests in Watch Mode

```bash
pnpm test:watch

```

## Current Unit Test Coverage

The unit tests cover the core authentication and authorization functionality.

### Authentication Service Tests

The authentication service tests verify:

- Successful user registration.
- Duplicate email rejection.
- Successful login.
- Incorrect password rejection.
- Inactive account rejection.
- Unknown email rejection.

### RolesGuard Tests

The `RolesGuard` tests verify:

- Access is granted when the user's role is permitted.
- Access is denied when the user's role is not permitted.
- Access is granted when an endpoint has no role requirement.

### RolesGuard Tests

```bash
pnpm lint
pnpm build
```

**Note:** The two test files currently contain nine passing tests. These are unit tests using mocked dependencies, not full end-to-end API tests.

## 14. Project Structure

````text
src/
├── auth/
│   ├── dto/
│   │   ├── auth-response.dto.ts
│   │   ├── change-password.dto.ts
│   │   ├── login.dto.ts
│   │   ├── register.dto.ts
│   │   └── update-profile.dto.ts
│   ├── auth.controller.ts
│   ├── auth.module.ts
│   ├── auth.service.ts
│   └── auth.service.spec.ts
│
├── users/
│   ├── dto/
│   │   ├── create-user.dto.ts
│   │   ├── update-user.dto.ts
│   │   └── users-query.dto.ts
│   ├── users.controller.ts
│   ├── users.module.ts
│   └── users.service.ts
│
├── common/
│   ├── decorators/
│   ├── dto/
│   ├── filters/
│   ├── guards/
│   │   ├── jwt-auth.guard.ts
│   │   ├── roles.guard.ts
│   │   └── roles.guard.spec.ts
│   ├── interceptors/
│   └── utils/
│
├── config/
│   └── app.config.ts
│
├── health/
│
├── prisma/
│   ├── prisma.module.ts
│   └── prisma.service.ts
│
├── generated/
│   └── prisma/
│
├── app.module.ts
└── main.ts

The generated Prisma Client directory is created by running:

```bash
pnpm prisma:generate
````

Do not manually edit generated Prisma Client files.

---

## 15. Fresh Installation — Quick Start

For someone setting up the project for the first time:

```bash
# 1. Clone the repository
git clone https://github.com/NestCloudOps/cloudops-backend.git

# 2. Enter the project directory
cd cloudops-backend

# 3. Install dependencies
pnpm install

# 4. Configure environment variables
cp .env.example .env

# 5. Start PostgreSQL
docker compose -f docker-compose.dev.yml up -d

# 6. Validate Prisma schema
pnpm prisma validate

# 7. Generate Prisma Client
pnpm prisma:generate

# 8. Apply database migrations
pnpm exec prisma migrate dev --name init

# 9. Seed the development database
pnpm prisma:seed

# 10. Build the application
pnpm build

# 11. Start development server
pnpm start:dev
```

After startup:

| Service       | URL                              |
| ------------- | -------------------------------- |
| Backend API   | http://localhost:3000/api        |
| Swagger UI    | http://localhost:3000/docs       |
| OpenAPI JSON  | http://localhost:3000/docs-json  |
| Health Check  | http://localhost:3000/api/health |
| Prisma Studio | Run `pnpm prisma:studio`         |

---

## 16. Troubleshooting

### PostgreSQL port already in use

If port `5432` is occupied, use a different host port in `docker-compose.dev.yml`.

For this project, PostgreSQL uses:

```yaml
ports:
  - '5433:5432'
```

Update `DATABASE_URL` accordingly.

### Database connection failure

Check that PostgreSQL is running:

```bash
docker compose -f docker-compose.dev.yml ps
```

Check container logs:

```bash
docker compose -f docker-compose.dev.yml logs postgres
```

Verify that `DATABASE_URL` in `.env` matches the database configuration.

### Prisma Client errors

Regenerate the client:

```bash
pnpm prisma:generate
```

### Build output missing

Run:

```bash
pnpm build
```

Then inspect the generated output:

```bash
ls -la dist
find dist -name "main.js"
```

If the output is missing, inspect `nest-cli.json`, `tsconfig.json`, and `tsconfig.build.json`.

### Dependency installation problems

Try a clean dependency installation:

```bash
rm -rf node_modules
pnpm install
```

Do not delete `pnpm-lock.yaml` unless you intentionally want to regenerate the dependency lockfile.

---

## 17. Development Notes

- Use `pnpm` consistently for package management.
- Keep `pnpm-lock.yaml` committed to Git.
- Never commit `.env`, credentials, or private keys.
- Use Prisma migrations for database schema changes.
- Validate all incoming API data.
- Keep authentication and authorization checks centralized.
- Do not expose internal exceptions or sensitive information in API responses.
- Run the build and lint checks before pushing changes.
- Keep Docker Compose development credentials restricted to local development.
