# Tasks

## 1. NestJS deletion contract and transaction

- [x] 1.1 Revise `DELETE /api/memories/:memoryId` to require no body, DTO, or version token; preserve HTTP 200 with envelope `data: null`. Verify bodyless success and remove stale-version 409 expectations.
- [x] 1.2 Implement one ordered cascade transaction: lock membership/space then memory, recheck authorization, soft-delete comments including replies and reactions, mark attached originals and derivatives `deleting`, and mark the memory deleted last. Verify rollback at each failure point and preservation of prior child deletion timestamps.
- [x] 1.3 Map malformed identifiers to the shared 400 validation failure, unavailable targets and repeat requests to generic 404, missing session to 401, and unexpected cascade failures to safe errors without partial writes. Verify deleting an available memory changed since confirmation succeeds against current state.
- [x] 1.4 Confirm all memory-derived reads and aggregates exclude soft-deleted parents, including reaction summaries and dashboard recent items; verify with API-owned tests.
- [x] 1.5 Update OpenAPI/Scalar for bodyless deletion, null success data, cascade semantics, and absence of a version-conflict response; verify HTTP and documentation tests match.
- [x] 1.6 Add nullable reaction `deletedAt` through the shared Prisma schema and migration; update application-owned reaction reads and writes to exclude tombstones and preserve valid toggle behavior without unique-key failures. Cover behavior in API tests; add no database test suite.
- [x] 1.7 Coordinate comment creation, replies, edits, removals, and reaction mutations through the parent lock in their mutation transaction. Verify lock ordering and unavailable-before-version precedence when deletion wins; verify writes committed first are cascaded.
- [x] 1.8 Coordinate file-state changes with image-worker ownership and derivative publication. Verify deleting originals and variants cannot be revived and post-deletion publication cannot introduce active derivatives; preserve attribution for storage writes already in flight without scheduling cleanup.
- [x] 1.9 Verify overlapping placement and deletion use a compatible lifecycle boundary: placement committed first is deleted without stale-version conflict, and placement resuming after deletion returns unavailable without writes.

## 2. Detail-only deletion experience

- [x] 2.1 Replace the Supabase delete helper and the `[memoryId]` route DELETE/GET with an authenticated bodyless NestJS call; remove deletion-only version dependencies and identifier response parsing after caller checks. Verify request and null success data handling.
- [x] 2.2 Mount the existing confirmation action in the Timeline and Vault detail actions slot; verify both detail pages show Delete, neither shows Edit, and summary surfaces show no Delete control or request.
- [x] 2.3 Keep the synchronous single-flight guard and disabled pending state; verify rapid activation sends one request and cancel sends none.
- [x] 2.4 Handle 404, 401, unexpected failures, and unknown outcomes per the design without deletion-version conflicts or automatic replay. Verify availability reconciliation through both detail routes does not falsely attribute success to this request.
- [x] 2.5 Refresh Timeline, Vault, dashboard, and related caches and route to the destination list after success; verify browser-back freshness.

## 3. Legacy retirement

- [x] 3.1 Trace every caller of `delete_memory`, `resource-cleanup`, `cleanupResources`, `reapExpiredTemporaryMemoryObjects`, and `enqueue_memory_edit_cleanup`; record each in the change notes before removal.
- [x] 3.2 Remove the legacy delete helper, its tests, the `vercel.json` cron entry, the `/api/internal/resource-cleanup` route, and the cleanup calls in creation and edit upload routes; leave migration history and `implement-file-cleanup` untouched.
- [x] 3.3 Remove or update the legacy photo route only if it can serve PostgreSQL-only memories; otherwise leave it and verify it returns not-found for them.

## 4. Verification

- [x] 4.1 Run backend gates sequentially: `pnpm --filter 'api...' --filter 'workers...' check`, `pnpm --filter 'api...' --filter 'workers...' --workspace-concurrency=1 typecheck`, `pnpm --filter 'api...' --filter 'workers...' --workspace-concurrency=1 test:run`, and `pnpm --filter 'api...' --filter 'workers...' --workspace-concurrency=1 build`.
- [x] 4.2 Run `pnpm --filter web-app check`, `pnpm --filter web-app typecheck`, `pnpm --filter web-app test:run`, and `pnpm --filter web-app build`.
- [x] 4.3 With two authorized members on a running database, verify confirmation, cancellation, current-state deletion, repeated deletion, rollback, and controlled overlapping comment/reaction/placement/worker operations. Verify children and files transition before the memory, deleted state disappears from all projections, and no late writer revives it. Record unavailable runtime verification explicitly; do not add a database test suite.
- [x] 4.4 Verify media after deletion: no new signed URL is issued, and a URL issued before deletion stops working after its five-minute expiry. Report any unavailable runtime verification explicitly.
