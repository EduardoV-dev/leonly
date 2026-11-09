# Retire Supabase

**Priority:** After the remaining consumers are migrated or explicitly retired. **Dependencies:**
memory lifecycle migration and the disposition of legacy cleanup and data.

## Outcome

The application no longer requires Supabase clients, credentials, routes, storage, or operational jobs.

## Acceptance criteria

- Inventory runtime callers, public routes, scheduled jobs, credentials, database RPCs, and storage objects.
- Remove obsolete Next.js memory routes and helpers only after their callers are migrated or intentionally retired.
- Remove Supabase dependencies, environment variables, and obsolete setup documentation; update lockfiles.
- Decide the disposition of any existing legacy users, spaces, memories, media, and backups before shutdown.
  Existing migration slices exclude legacy import; do not assume it is required or already complete.
- Verify current user journeys and cleanup jobs without Supabase configuration, then follow a documented
  deployment and rollback sequence before decommissioning external resources.

Reference: [current routing](../../../../apps/api/README.md).
