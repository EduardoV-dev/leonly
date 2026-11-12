# Retire Supabase

**Priority:** After the remaining consumers are migrated or explicitly retired. **Dependencies:**
memory lifecycle migration and the disposition of legacy cleanup and data.

OpenSpec change: [retire-supabase](../../../../openspec/changes/retire-supabase/proposal.md).

## Outcome

The application no longer requires Supabase clients, credentials, routes, storage, or operational jobs.

## Data disposition

The owner has confirmed there is nothing to preserve: hosted legacy users, spaces, memories, social
data, media, and backups are disposable. Retirement requires no import, export, identity mapping,
or backup. Existing migration slices exclude legacy import; this is a confirmed decision, not an
unresolved prerequisite. Hosted resource deletion remains a separate operator action after
deployment verification, not an effect of applying the repository changes.

## Acceptance criteria

- Inventory runtime callers, public routes, scheduled jobs, credentials, database RPCs, and storage objects.
- Remove obsolete Next.js memory routes and helpers only after their callers are migrated or intentionally retired.
- Remove Supabase dependencies, environment variables, and obsolete setup documentation; update lockfiles.
- ~~Decide the disposition of any existing legacy users, spaces, memories, media, and backups before
  shutdown. Existing migration slices exclude legacy import; do not assume it is required or already
  complete.~~ Decided: no preservation (see above).
- Verify current user journeys and cleanup jobs without Supabase configuration, then follow a documented
  deployment and rollback sequence before decommissioning external resources.

External shutdown is still pending: repository work does not itself decommission the hosted project,
and no operator deployment/verification evidence exists yet.

Reference: [current routing](../../../../apps/api/README.md).
