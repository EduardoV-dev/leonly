# Leonly API

## API reference

Run the API locally, then open `http://localhost:3001/docs` for the Scalar reference or
`http://localhost:3001/openapi.json` for the OpenAPI document. Nest endpoints use the `/api`
prefix. Protected endpoints require the Better Auth session cookie; browser clients must send
credentials. State-changing browser requests must come from the configured `WEB_APP_ORIGIN`.

| Method | Endpoint | Successful `data` | Endpoint-specific failures |
| --- | --- | --- | --- |
| GET | `/api/health` | `{ "database": true, "redis": true }` | 503 if either dependency is unhealthy |
| POST | `/api/spaces` | `{ "space_id": "<uuid>" }` | 400 invalid fields; 409 active membership already exists |
| POST | `/api/spaces/memberships/onboarding` | `{ "completed": true }` | 409 no active membership |
| POST | `/api/spaces/invite-validations` | `{ "valid": true }` | 400 invalid input; 404 unavailable invite; 429 attempts locked |
| POST | `/api/spaces/memberships` | `{ "space_id": "<uuid>" }` | 400 invalid input; 404 unavailable invite; 429 attempts locked |
| GET | `/api/users/me/space` | Active space with members, or `null` | 401 missing or expired session |

All successful Nest operations return HTTP 200 with a JSON body, including when `data` is null:

```json
{
  "ok": true,
  "data": { "space_id": "0199a9aa-1234-7000-8000-111111111111" },
  "error": [],
  "message": "Request completed successfully"
}
```

### Error responses

Errors use the same envelope with `ok: false`, a nonempty `error` array, and a readable
`message`. Each error has a `code`, `message`, and optional `field`. Ordinary errors have
`data: null`; health failures preserve dependency diagnostics. Documented examples are generic;
validation and domain failures can provide more specific messages.

| Status | Meaning | Error code |
| --- | --- | --- |
| 400 | Invalid request; validation errors identify the affected field | `HTTP_400` or `VALIDATION_ERROR` |
| 401 | Missing or expired authentication | `HTTP_401` |
| 403 | Request forbidden, including rejected cross-site mutations | `HTTP_403` |
| 404 | Resource or usable invite not found | `HTTP_404` |
| 409 | Request conflicts with the user's membership state | `HTTP_409` |
| 429 | Invite attempts locked; wait the `Retry-After` number of seconds | `HTTP_429` |
| 500 | Unexpected server failure; internal details are not returned | `INTERNAL_ERROR` |
| 503 | Service temporarily unavailable | `HTTP_503` |

```json
{
  "ok": false,
  "data": null,
  "error": [
    { "code": "VALIDATION_ERROR", "field": "space_name", "message": "Space name must be between 2 and 100 characters." }
  ],
  "message": "Space name must be between 2 and 100 characters."
}
```

### Health checks

`GET /api/health` is public and returns `Cache-Control: no-store`. A failed PostgreSQL or Redis
probe returns HTTP 503 while preserving both results:

```json
{
  "ok": false,
  "data": { "database": false, "redis": true },
  "error": [
    { "code": "HTTP_503", "message": "Service is temporarily unavailable. Please try again later." }
  ],
  "message": "Service is temporarily unavailable. Please try again later."
}
```

## Google sign-in

The API hosts Better Auth at `/api/auth/*` and stores users, Google accounts, sessions, and
OAuth verification records in PostgreSQL through Prisma. The first Google sign-in creates an
auth user and account; subsequent sign-ins reuse them. Email/password sign-in and automatic
email-based account linking are disabled.

Better Auth routes use their own response and redirect protocol, rather than the Nest envelope,
and are not included in the generated Nest OpenAPI document.

## Local setup

Set these environment variables for the API:

| Variable | Value |
| --- | --- |
| `DATABASE_URL` | PostgreSQL connection string |
| `BETTER_AUTH_SECRET` | Stable, private secret (at least 32 characters); generate one with `openssl rand -base64 32` |
| `GOOGLE_CLIENT_ID` | Google OAuth web-client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth web-client secret |
| `NODE_ENV` | Runtime mode; use `development` locally. Other values use production-style logging |
| `PORT` | API listen port; defaults to `3001` |
| `UPSTASH_REDIS_REST_URL` | Redis HTTP endpoint; local Docker setup uses `http://localhost:8079` |
| `UPSTASH_REDIS_REST_TOKEN` | Redis HTTP token; local Docker setup uses `local-redis-token` |
| `WEB_APP_ORIGIN` | Frontend origin allowed by CORS, Better Auth, and CSRF protection, and used for OAuth callbacks, for example `http://localhost:3000` |
| `BETTER_AUTH_COOKIE_DOMAIN` | Optional shared parent domain for frontend and API subdomains, for example `example.com`. Leave unset on localhost |

In Google Cloud, register `http://localhost:3000/api/auth/callback/google` as an authorized
redirect URI (replace the origin for other environments). The Next.js authentication proxy
forwards this path to this API. Then, from the repository root:

```bash
docker compose -f apps/api/docker-compose.yml up -d postgres redis redis-http
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
`WEB_APP_ORIGIN` is required. Better Auth uses it to construct OAuth callback and redirect URLs.
Use the public frontend origin, not the internal `API_BASE_URL` used by the Next.js server. Nest
uses this origin for CORS and trusts it for cross-origin state-changing requests.

## Web app API routing

Only authentication uses the Next.js proxy at `/api/auth/*`. The Better Auth browser client
continues to use the frontend origin, including Google callbacks and sign-out.
The `api` Axios client calls Nest directly with credentials; server-side callers use the
server-only `serverApi` client and forward the incoming session cookie.

Configure these values in the web app:

| Variable | Value |
| --- | --- |
| `NEXT_PUBLIC_API_BASE_URL` | Nest origin, without `/api`, used by browser and server-side clients, for example `http://localhost:3001` or `https://api.example.com`. Set before building the web app |

Locally, use `localhost` for both applications: cookies are shared across ports, and no cookie
domain is needed. Do not mix `localhost` and `127.0.0.1`.

For production at `app.example.com` and `api.example.com`, set the API's
`BETTER_AUTH_COOKIE_DOMAIN=example.com`, `WEB_APP_ORIGIN=https://app.example.com`, and the web
app's `NEXT_PUBLIC_API_BASE_URL=https://api.example.com`. Both applications must use HTTPS.
The parent cookie domain must contain both hosts and only trusted applications; unrelated
frontend and API domains cannot share this session cookie. Existing host-only sessions may
require clearing old cookies and signing in again after changing the cookie domain.

The web app's Supabase-backed endpoints remain Next.js routes and are not sent to Nest.
