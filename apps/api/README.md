# API Google sign-in

The API hosts Better Auth at `/api/auth/*` and stores users, Google accounts, sessions, and
OAuth verification records in PostgreSQL through Prisma. The first Google sign-in creates an
auth user and account; subsequent sign-ins reuse them. Email/password sign-in and automatic
email-based account linking are disabled.

## Local setup

Set these environment variables for the API:

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string |
| `APP_BASE_URL` | Public frontend origin used by Better Auth for OAuth callbacks, for example `http://localhost:3000` |
| `BETTER_AUTH_SECRET` | Stable, private secret (at least 32 characters) |
| `GOOGLE_CLIENT_ID` | Google OAuth web-client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth web-client secret |
| `WEB_APP_ORIGINS` | Comma-separated frontend origins trusted by Better Auth, for example `http://localhost:3000` |

In Google Cloud, register `http://localhost:3000/api/auth/callback/google` as an authorized
redirect URI (replace the origin for other environments). The Next.js BFF forwards this path to
this API. Then, from the repository root:

```bash
docker compose -f apps/api/docker-compose.yml up -d postgres
pnpm --filter api prisma:migrate
pnpm --filter api dev
```

The API loads `apps/api/.env` through `dotenv` for both Prisma CLI commands and Nest startup. The build is split into `pnpm --filter api prisma:generate` and `pnpm --filter api build:app`; `pnpm --filter api build` runs both. Use `pnpm --filter api prisma:migrate:dev` to create or evolve migrations during local development, and `pnpm --filter api prisma:migrate` to apply existing migrations. Database migrations are never run during the container build.

When the API runs on the host, use:

```env
DATABASE_URL=postgresql://leonly:leonly@localhost:5434/leonly?schema=public
```

The Google flow starts with `POST /api/auth/sign-in/social` and `{ "provider": "google" }`.
Better Auth returns the Google authorization URL and sets an OAuth state cookie; the client
must preserve that cookie for the callback. `GET /api/auth/get-session` reads the session.
`APP_BASE_URL` is required because Better Auth uses the public application origin to construct
OAuth callback and redirect URLs. It is intentionally the frontend origin, not the internal
`API_BASE_URL` used by the Next.js server. Set `WEB_APP_ORIGINS` to the frontend origins that
may call the API; Better Auth uses the same origins for origin checks. Browsers should call the
Next.js BFF rather than this API directly. The web app's application data and Supabase-backed
routes remain a separate integration boundary.
