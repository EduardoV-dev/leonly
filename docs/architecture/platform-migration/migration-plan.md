# Platform Migration Plan

This plan moves Leonly from Supabase and Next.js-owned backend behavior to the target architecture
without adding product features. Each phase has an exit gate and a rollback boundary. Do not start a
later phase while an earlier gate is failing.

## Delivery rules

- Freeze feature work until the final decommission gate passes.
- Preserve observable behavior; architecture migration is not a redesign opportunity.
- Keep applied migrations immutable. Every database change is forward-only.
- Migrate one capability at a time with its tests and operational checks.
- Prefer a bounded maintenance cutover over dual writes.
- Keep Supabase available and unchanged until post-cutover validation completes.
- Record row counts, object counts, commands, timestamps, and verification results as migration
  receipts. Never record secrets.
- Do not make any implementation choice without the user's prior opinion, decision, and explicit
  approval. This includes architecture, behavior, dependencies, security, data, deployment,
  sequencing, naming, and local code structure. Do not infer approval from silence.
- Before a migration batch reaches 800 changed textual lines, stop and request review. Count every
  addition and deletion across source, tests, migrations, configuration, lockfiles, generated text,
  and documentation. An indivisible change that cannot fit requires an explicit exception before
  work begins.
- Requested revisions remain in the same unapproved batch and count toward its cumulative
  800-line limit. Split the work or obtain an explicit exception before that limit is exceeded.
- Record every checkpoint in `checkpoints/` using its required template. Include the complete diff,
  per-file line counts, verification evidence, every decision made or pending, and the user's
  explicit outcome. Resume only after the user explicitly chooses to continue or change direction.

## Phase overview

| Phase | Outcome | Supabase dependency after phase |
| --- | --- | --- |
| 0. Baseline and decisions | Current contracts are frozen and unknowns have owners. | Unchanged |
| 1. NestJS boundary | All business operations have a NestJS API destination. | Database, Auth, Storage |
| 2. Backend extraction | Next.js no longer owns business persistence or storage logic. | Database, Auth, Storage |
| 3. R2 migration | New and existing objects are served from private R2. | Database, Auth |
| 4. Neon migration | Relational data and authorization run on Neon. | Auth only, if retained temporarily |
| 5. Cache and jobs | Required cleanup/jobs run outside Next.js; measured caching is enabled. | Auth only, if retained temporarily |
| 6. Auth and decommission | Supabase is no longer required. | None |

## Phase 0: Freeze and inventory

### Work

- Declare the feature freeze and identify the last accepted behavior commit.
- Inventory every Next.js route, Supabase RPC, direct table query, storage operation, cron, secret,
  and external callback.
- Capture API behavior for identity, spaces, memories, comments, reactions, media, and cleanup.
- Record current database row counts and R2-source object counts by prefix.
- Decide authentication, PostgreSQL access, NestJS deployment, and private media delivery.
- Define availability, acceptable maintenance duration, recovery point, and rollback window.

### Exit gate

- Every current capability has an owner and migration phase.
- Critical decisions in the architecture document are resolved or explicitly block the next phase.
- Existing application verification passes before migration code begins.

### Rollback

Documentation only; remove the planning artifacts without runtime impact.

## Phase 1: Establish the NestJS backend

### Work

- Add `apps/api` to the existing pnpm/Turborepo workspace.
- Configure validated environment variables, structured logging, request IDs, health endpoints,
  graceful shutdown, and production-safe error responses.
- Implement authentication verification and map the external subject to the existing internal user.
- Define the API contract for existing behavior; do not add endpoints for hypothetical features.
- Add database and object-storage boundaries around current providers only where a migrated
  capability needs them.
- Establish contract and integration tests against replaceable database/storage test boundaries.

### Exit gate

- NestJS starts, reports readiness, and shuts down without dropping in-flight requests.
- Authenticated and unauthenticated API behavior is tested.
- No production traffic is moved yet.

### Rollback

Remove `apps/api`; the current Next.js/Supabase application remains authoritative.

## Phase 2: Extract backend behavior from Next.js

Migrate in complete vertical slices. A slice includes its endpoint, authorization, validation,
persistence call, tests, observability, and frontend caller.

### Slice order

1. Identity and active-space reads.
2. Timeline, vault, memory detail, and media authorization reads.
3. Comments and reactions.
4. Space setup and settings mutations.
5. Memory create, edit, placement, and deletion.
6. Resource cleanup administration.

Keep the current Supabase database and storage during this phase. This isolates backend extraction
from data-provider migration.

### Exit gate

- Next.js contains presentation, browser state, and API consumption only.
- Browser code has no Supabase database or storage client.
- NestJS passes behavioral parity tests for every migrated slice.
- Current photo processing runs in a Node-capable NestJS environment, not a frontend Worker.

### Rollback

Route one slice back to its existing Next.js handler. Do not maintain two writable implementations
after a slice is accepted.

## Phase 3: Move object storage to R2

### Prepare

- Create a private R2 bucket and least-privilege application and migration credentials.
- Implement exact object-key validation, short-lived upload/read grants, CORS, size limits, MIME
  validation, and cleanup deletion through NestJS.
- Preserve all current object keys.
- Decide whether authorized media is delivered by short-lived R2 URLs or a Cloudflare Worker.
- Keep originals private; cache only immutable derived variants after authorization.

### Copy

1. Take an initial inventory of source keys and sizes.
2. Bulk-copy immutable objects while the application remains online.
3. Verify destination keys, sizes, and checksums where available.
4. Enter maintenance mode and stop uploads/edits.
5. Copy the final delta and repeat verification.
6. Switch NestJS storage configuration to R2.
7. Exercise upload, read, edit, deletion, and cleanup paths.

### Exit gate

- Every ready database object path exists in R2.
- No unexpected R2 objects are publicly accessible.
- Upload and media-read credentials are short-lived and path-scoped.
- Cleanup is idempotent when an object is already absent.

### Rollback

Before writes resume, switch NestJS back to Supabase Storage. After R2 writes resume, rollback
requires copying the R2 delta back first.

## Phase 4: Move PostgreSQL to Neon

### Prepare the schema

- Create separate owner/migration, runtime, and operational roles.
- Use a direct Neon connection for migrations and a pooled connection for runtime traffic.
- Recreate required extensions, custom types, tables, constraints, indexes, functions, and grants.
- Replace `auth.uid()` with transaction-local authenticated identity.
- Replace Supabase `authenticated` and `service_role` assumptions with explicit Neon roles.
- Exclude Supabase-managed `auth`, `storage`, and `realtime` schemas.
- Keep RLS enabled and test cross-space denial through the restricted runtime role.

### Move the data

1. Rehearse the complete export and import against a disposable Neon branch.
2. Record source and destination counts for every application table.
3. Enter maintenance mode and stop API mutations, workers, and cleanup.
4. Export application data using the direct Supabase PostgreSQL connection.
5. Import into the prepared Neon schema while preserving UUIDs and timestamps.
6. Validate constraints, row counts, membership ownership, memory assets, and sampled records.
7. Switch only NestJS to the Neon connection.
8. Run read-only smoke tests before enabling writes.
9. Enable writes and run create/edit/delete and authorization smoke tests.

### Exit gate

- Source and destination table counts match or have a documented explanation.
- No policy uses Supabase `auth.uid()` or managed roles.
- Tenant-isolation tests pass using the runtime role.
- NestJS health checks include database connectivity without exposing internals.
- A backup and rollback timestamp are recorded.

### Rollback

Before Neon writes are enabled, point NestJS back to Supabase. After Neon accepts writes, either
finish the cutover or perform a controlled reverse-delta migration; never silently discard new data.

## Phase 5: Add cache and required jobs

### Upstash Redis

- Begin with Redis disabled and collect endpoint latency and query evidence.
- Add cache-aside reads only where evidence justifies them.
- Use versioned keys containing the space and resource identity.
- Set a TTL on every cache entry and bound payload sizes.
- Invalidate only after the owning database transaction commits.
- Verify correctness with Redis unavailable and after stale-key injection.

### Background work

- Select the job platform using the criteria in the architecture document.
- Move scheduled resource cleanup first and remove the Vercel cron only after parity is proven.
- Make each handler idempotent and persist authoritative job state in Neon when business recovery
  requires it; queue delivery state alone is not business state.
- Configure retries, backoff, dead-letter handling, concurrency, alerts, and replay procedures.
- Move Sharp photo processing only to a Node-compatible worker and only after the upload flow can
  expose processing state without breaking current behavior.

### Exit gate

- Cache loss affects latency only, never correctness.
- Duplicate job delivery is safe.
- Failed jobs are observable and replayable.
- The current Vercel cleanup route and cron are removed after replacement verification.

### Rollback

Disable cache reads and return to direct Neon queries. Pause new job production, drain or quarantine
the queue, and run the previous synchronous/cron path until the failure is understood.

## Phase 6: Migrate authentication and decommission Supabase

Skip the auth migration here if it was completed earlier to establish NestJS.

### Work

- Export the minimum identity mapping required for account continuity.
- Link each new verified provider identity to the existing internal `users.id`.
- Require users to establish fresh sessions; do not attempt to preserve Supabase session tokens.
- Verify login, callback, refresh, logout, revoked access, and deleted-user behavior.
- Remove Supabase SDKs, environment variables, callback URLs, storage policies, and operational jobs.
- Retain backups for the agreed rollback and compliance period, then revoke Supabase credentials.

### Final gate

- No runtime request reaches Supabase.
- Next.js depends only on the NestJS contract and the chosen auth client behavior.
- NestJS exclusively owns Neon, R2, Redis, and job access.
- Production smoke tests and tenant-isolation checks pass.
- Runbooks, diagrams, environment documentation, and disaster recovery procedures match production.
- The feature freeze may end only after this gate is accepted.

## Cutover verification checklist

### Data

- [ ] Application table counts match.
- [ ] Primary and foreign key constraints validate.
- [ ] Active membership cardinality remains valid.
- [ ] Memory, comment, and reaction samples match.
- [ ] Every ready object path resolves to the expected R2 object.
- [ ] No private object is anonymously readable.

### Behavior

- [ ] Authentication and account linking work.
- [ ] Timeline, vault, details, comments, and reactions match current behavior.
- [ ] Memory creation, editing, placement, and deletion work.
- [ ] Optimistic concurrency and mutation retry behavior remain intact.
- [ ] Cleanup and failed-job recovery work.
- [ ] Cache disablement does not change responses.

### Operations

- [ ] Health, readiness, logs, traces, metrics, and alerts are available.
- [ ] Secrets are stored only in the owning runtime.
- [ ] Database migrations use a direct connection and remain forward-only.
- [ ] Rollback commands and responsible owner are recorded.
- [ ] Supabase remains untouched until the rollback window closes.
