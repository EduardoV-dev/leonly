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
- [ ] WEB-01 (separate change): Replace the web app's Supabase login with the API's Better Auth
  client flow when web integration is requested.

## Review path and boundaries

Review `apps/api/src/create-app.ts` and `src/auth/config/auth.config.ts` first. The Nest-owned
`PrismaService` is passed to the Prisma adapter; `src/auth/handler.ts` converts Better Auth's
handler to Express and the route is mounted before Nest configures JSON body parsing. The
first Google login may create a Better Auth user; implicit linking by matching email is
disabled. `apps/api/prisma/migrations/20260923160000_auth_foundation/migration.sql` creates
only the auth tables. The migration has not been applied to a live database and no live Google
credentials were used. No application-data migration or browser login changes are included.

The earlier phase-0 legacy identity policy remains historical planning for a different
cutover scenario; this fresh-install endpoint does not implement that policy. A browser
integration will need an explicit trusted-origin and cookie strategy before using this
endpoint from a separate web origin.

Rollback boundary for this unit: remove the handler mount and restore the previous auth
factory, AppModule, and HTTP tests. The migration and API setup instructions belong with the
new endpoint; do not apply or roll back SQL against a populated database without review.
