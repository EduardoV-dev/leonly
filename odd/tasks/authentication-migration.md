# Authentication migration — Google API login

## Scope

Build Google login in the NestJS API for a fresh Leonly installation. The user explicitly
replaced the earlier legacy-identity reconciliation requirement: Better Auth creates its own
users, accounts, and sessions in PostgreSQL. The existing web app's Supabase login is outside
this API work. The user will review the implementation and request any changes; no commit or
push was requested. Report authored changed lines at handoff, with a review checkpoint around
1,000 lines; count the tracker and exclude generated files and the lockfile separately.

## Work units

- [x] AUTH-01a: Expose the immutable API environment-variable contract and colocated tests.
- [x] AUTH-01b: Configure Prisma 7 client, PostgreSQL auth models, and the Better Auth Google
  options. Prisma CLI uses `prisma.config.ts`; Nest owns the runtime Prisma connection.
- [x] AUTH-02: Adapt Better Auth to a Node handler and mount `/api/auth/*` before Nest's body
  parser. The endpoint accepts Google OAuth sign-in and callbacks and provides session routes.
- [x] AUTH-03: Generate a versioned initial migration for auth tables, document local setup,
  and test HTTP sign-in initiation, error paths, session access, and Prisma wiring.
- [x] WEB-01 (separate change): Replace the web app's Supabase login with the API's Better Auth
  client flow when web integration is requested.

## Review path and boundaries

Review `apps/web-app/src/app/api/auth/[...path]/route.ts` and
`apps/api/src/create-app.ts` first. The same-origin Next.js BFF forwards Better Auth requests to
the Nest-owned API; `PrismaService` is passed to the Prisma adapter; `src/auth/handler.ts`
converts Better Auth's handler to Express and the route is mounted before Nest configures JSON
body parsing. The first Google login may create a Better Auth user; implicit linking by matching
email is disabled. `apps/api/prisma/migrations/20260923160000_auth_foundation/migration.sql`
creates only the auth tables. The migration has not been applied to a live database and no live
Google credentials were used. The frontend auth page now uses the Better Auth client and returns users to the
welcome start flow after login, while application data and the existing Supabase-backed routes remain outside this
frontend-only change. The Supabase session proxy remains removed. The Next proxy checks Better Auth sessions:
unauthenticated application requests redirect to `/auth`, and authenticated requests to `/auth` redirect to the
welcome start flow. The welcome start screen no longer has its own Supabase auth or active-space guard, and the
remaining Supabase data adapters stay to be migrated feature by feature.

The earlier phase-0 legacy identity policy remains historical planning for a different
cutover scenario; this fresh-install endpoint does not implement that policy. The browser calls
the same-origin Next.js route at `/api/auth/*`; that BFF forwards requests to the Nest API using
the server-only `API_BASE_URL`, while Better Auth checks the frontend origin through
`WEB_APP_ORIGINS`.

Rollback boundary for this unit: remove the handler mount and restore the previous auth
factory, AppModule, and HTTP tests. The migration and API setup instructions belong with the
new endpoint; do not apply or roll back SQL against a populated database without review.
