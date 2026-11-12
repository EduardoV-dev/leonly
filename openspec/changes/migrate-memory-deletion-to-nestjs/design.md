# Design

## Context

See [proposal.md](proposal.md) and the four capability delta specs for behavior.

- Placement uses an atomic version-checked update. Reaction toggle and comment creation explicitly lock the parent; comment edit and removal currently do not. They must coordinate with the new cascade.
- The legacy `delete_memory` RPC updates only `deleted_at` on the Supabase row. Its Next.js route and `use-delete-memory.ts` still depend on the opaque version and on a GET availability check.
- Memory and comment rows already have deletion timestamps. Reactions need a nullable deletion timestamp and migration. Files already support `deleting`. Read and worker paths require verification against the expanded cascade.
- Current detail readers issue five-minute signed URLs, and the `api-endpoints` spec already accepts that URLs may outlive access changes until expiry.
- Storage cleanup (`resource_cleanup` and its cron) exists only for legacy Supabase objects. Cleanup for current storage remains deferred.

## Goals / Non-Goals

**Goals:** One bodyless NestJS delete path, atomic ordered cascade, shared lifecycle locking, authorization at commit, detail-only confirmation, and legacy runtime retirement.

**Non-Goals:** Hard deletion, storage object removal, a revocable media gateway (rejected in favor of the accepted expiry window), new retention policy, restore, and edit.

## Decisions

### 1. Bodyless `DELETE /api/memories/:memoryId`

Remove deletion's body, DTO, and timestamp comparison. Delete means deleting current authorized state, including changes committed after confirmation opened. Keep optimistic tokens for independent edits and placement. Success returns HTTP 200 with the standard envelope and `data: null`; malformed identifiers are rejected by the shared UUID validator as HTTP 400, while unavailable targets and repeat requests return generic 404. There is no stale-version deletion 409.

### 2. One transaction and a shared parent-row lock

Lock membership/space and then the target memory inside the cascade transaction; recheck authorization and availability under those locks. Apply consistent ordering across related writers. Hold locks until commit or rollback, keep transactions bounded, and perform no storage/network calls while holding locks. Use scoped row locks, not exclusive whole-table locks. Child updates acquire normal PostgreSQL row locks without separate locking reads for every child.

All comment/reply creation, editing, removal, and reaction writes must acquire the same parent lock in their mutation transaction and check availability after waiting. Keep their independent version semantics, but parent unavailability takes precedence over a stale child version. Check placement and worker publication against the same lifecycle boundary: a mutation committed first is included, while one resuming after deletion must not revive deleted state. Ordinary reads are not blocked by this protocol; subsequent reads must filter deleted state.

### 3. Cascade children first and memory last

After authorization, soft-delete all active comments including replies, soft-delete active reactions, mark attached originals and derivatives `deleting`, then set memory `deleted_at` last. Preserve existing child deletion timestamps, attachment associations, object keys, and attribution. Any failure rolls back all steps. Add reaction `deletedAt` in the shared schema and migrate existing rows as active; update reads and toggle behavior so tombstoned reactions do not appear or block valid reuse of the member/memory identity.

Coordinate file transitions with worker ownership and publication so stale execution cannot restore readiness or publish active derivative records after deletion. Storage writes already in flight cannot be cancelled by a database lock; preserve attribution for retained outputs and defer physical removal. No storage deletion or cleanup scheduling occurs in this request. Audit parent and child filters in lists, detail, social summaries, related items, and dashboard projections.

### 4. Media follows the accepted expiry window

No reader issues new signed URLs for a deleted memory. Already-issued URLs remain valid until their own five-minute expiry. The spec records this as an explicit trade-off, not a defect.

### 5. Detail-only confirmation, reusing the existing dialog

Mount the existing `MemoryDeleteAction` dialog into the `MemoryDetailView` actions slot on Timeline and Vault detail, next to placement. Keep it out of every summary surface. Keep the synchronous single-flight guard and disabled pending state. Edit stays unmounted.

### 6. Client calls the NestJS API

Replace `requestMemoryDeletion` with an authenticated bodyless `api.delete` call. Do not require a detail version or inspect a returned identifier. On 401 use the authentication flow; on 404 show unavailable and refresh. After an unknown outcome, never auto-replay or claim this request succeeded solely from 404 reads. Check both Timeline and Vault detail: either readable means retryable failure; neither readable means generic unavailable and cache refresh. Only an acknowledged success produces deletion-success feedback.

### 7. Retire the legacy paths

Remove the Next.js `[memoryId]` route's DELETE and availability GET, the Supabase `delete-memory.ts` helper and its tests, and the `resource-cleanup` runtime. That covers `vercel.json` cron, the `/api/internal/resource-cleanup` route, and `cleanupResources` call sites in legacy creation and edit upload routes and their `enqueue_memory_edit_cleanup` dependency. The prior decision was to retire legacy Supabase cleanup without replacement. Remove the `delete_memory`, `claim_resource_cleanup`, and related RPC references from application code only, and leave migration history intact.

## Risks / Trade-offs

- **Five-minute media window** → accepted for new storage requests using an already-issued URL. Downloaded bytes cannot be retracted; URL expiry does not erase browser copies.
- **Lost response after commit** → reconcile through both detail routes before any retry; never replay automatically.
- **Lock ordering and revocation races** → follow the placement and comment order, and recheck membership in the transaction. Mocks cannot prove PostgreSQL lock scheduling; cover overlapping requests with real-database verification.
- **Cleanup retirement** → remove legacy callers coherently. Deferred current-storage cleanup does not imply migration or cleanup of legacy Supabase objects.
- **Stale cached lists after deletion** → refresh Timeline, Vault, dashboard, and related caches, and verify browser-back freshness.

## Legacy caller trace

Traced before removal (task 3.1):

- `delete_memory` RPC — sole application caller: `apps/web-app/src/features/memories/server/delete-memory.ts` (`deleteMemory`), reached from `apps/web-app/src/app/api/memories/[memoryId]/route.ts` `DELETE`, covered by `delete-memory.test.ts` and `route.test.ts`. Removed with the helper and the route.
- `resource-cleanup` — `apps/web-app/src/app/api/internal/resource-cleanup/route.ts` (`GET` + `route.test.ts`), scheduled by the `vercel.json` cron entry `0 3 * * *`. Removed with the route and the cron entry.
- `cleanupResources` — defined in `apps/web-app/src/features/memories/server/resource-cleanup.ts`; called by the resource-cleanup route, `apps/web-app/src/app/api/memories/uploads/route.ts` (fire-and-forget after creation uploads), and `apps/web-app/src/app/api/memories/[memoryId]/edit/uploads/route.ts` (awaited before edits); re-exported from `create-memory.ts` and `edit-memory.ts`. All call sites removed with the helper and its tests.
- `reapExpiredTemporaryMemoryObjects` — defined in `resource-cleanup.ts`; sole caller is the resource-cleanup route. Removed with it.
- `enqueue_memory_edit_cleanup` — sole caller: `enqueueEditCleanup` in `apps/web-app/src/features/memories/server/edit-memory.ts` (six call sites around the legacy edit RPC lifecycle). Calls removed per the retirement decision; the legacy Supabase RPC remains defined in Supabase migration history, which stays untouched. Temporary Supabase upload paths from superseded edits are no longer purged by any runtime; this is accepted because cleanup without replacement was the prior decision, and current-storage cleanup stays deferred to `implement-file-cleanup`.
- `CRON_SECRET` environment variable and `MemoryEditLink` — unused after the route retirement and the detail-only Delete mounting; removed.

## Runtime verification record

Tasks 4.3 and 4.4 were exercised against the running development database (`api-postgres-1`,
`localhost:5434`) through the real `MemoriesService`, `MemoryCommentsService`,
`MemoryReactionsService`, and `MemoryDetailService` with two seeded active members. The temporary
verification script was removed after the run; no database test suite was added. Verified:

- Cascade in one transaction: comments (including a reply) and the reaction gained `deleted_at`,
  the attached original and its cover variant moved to `deleting` with keys and attribution kept,
  and the memory was marked deleted; a repeat deletion returned generic not-found.
- Rollback: blocking the reaction update with a real row lock aborted the whole deletion
  transaction (Prisma interactive-transaction timeout) — the memory kept no deletion timestamp,
  its comment stayed active, and the file stayed `ready`.
- Lock coordination: a comment committed while deletion waited on the parent lock was included in
  the cascade; a comment edit that acquired the parent lock after deletion committed received
  generic not-found before its version check and wrote nothing.
- Projections: both members' detail reads and late comment, reaction, and placement writes were
  rejected as unavailable; the deleted memory disappeared from product reads.
- Media: the detail read rejects before signing, so no new signed URL is issued for a deleted
  memory. Explicitly not verified: storage-side behavior of a URL issued before deletion over its
  five-minute expiry (no storage runtime available in this environment).

The image-worker overlap scenarios were verified by reading the worker's status-guarded writes and
its existing unit tests (deleting variants are not downgraded, stale roots cannot renew, failure
bookkeeping requires `uploaded` status); a live worker run against SQS and storage was not
available in this environment and is recorded as such.

## Migration Plan

1. Add the reaction deletion migration, revise the endpoint to bodyless deletion, implement the cascade and mutation locking, and update API tests and documentation.
2. Replace the client delete path and mount detail-only confirmation; verify pending, success, unavailable, failure, and unknown-outcome behavior.
3. Retire the legacy delete route/helper and legacy cleanup runtime after caller checks; run backend and web gates sequentially.
4. Deploy the additive reaction migration and compatible readers/writers before enabling cascading deletion and the web consumer. Rollback disables deletion controls while retaining schema and tombstone-aware readers; do not restore memory-only deletion or redirect writes to Supabase.
