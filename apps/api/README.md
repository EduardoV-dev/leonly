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
| `BETTER_AUTH_BASE_URL` | Public API origin, for example `http://localhost:3001` |
| `BETTER_AUTH_SECRET` | Stable, private secret (at least 32 characters) |
| `GOOGLE_CLIENT_ID` | Google OAuth web-client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth web-client secret |

In Google Cloud, register `http://localhost:3001/api/auth/callback/google` as an authorized
redirect URI (replace the origin for other environments). Then, from the repository root:

```bash
pnpm --filter api exec prisma migrate deploy
pnpm --filter api dev
```

The Google flow starts with `POST /api/auth/sign-in/social` and `{ "provider": "google" }`.
Better Auth returns the Google authorization URL and sets an OAuth state cookie; the client
must preserve that cookie for the callback. `GET /api/auth/get-session` reads the session.
The web app still uses its existing Supabase login; connecting it to these API endpoints is
a separate change.
