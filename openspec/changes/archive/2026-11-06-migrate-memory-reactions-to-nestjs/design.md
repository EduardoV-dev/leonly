# Design

## Context

See `proposal.md` for motivation and scope. The current schema in `packages/database` has `Memory` and `SpaceMember` models with same-space composite keys, but no reaction model. NestJS already owns authenticated Timeline and Vault detail reads through the memories module. The web app's current detail loader consumes those responses, while its retained reaction hook calls a Next.js route backed by Supabase RPCs.

`MemoryDetailView` already provides a reaction slot. Both detail pages currently leave it empty. The existing `MemoryReactions` component provides a picker, optimistic updates, pending controls, and member-name tooltips; reuse it rather than redesigning the screen.

## Goals / Non-Goals

**Goals:**
- Keep one authoritative reaction implementation inside the API memories module, reused by detail reads and standalone summary/toggle operations.
- Enforce tenant integrity in the database and active-membership authorization in the application.
- Preserve the existing reaction experience while making fresh server data authoritative after mutation settlement.

**Non-Goals:**
- Legacy-data import, realtime subscriptions, automatic cross-client synchronization, or stored aggregate counters.
- Reaction data on list or related-memory cards, additional reaction types, comments, or other memory mutations.
- Database integration test suites, new dependencies, or changes to historical Supabase migrations.

## Decisions

### 1. Store one current reaction per space member and memory

Add a `MemoryReaction` model mapped to `memory_reactions` and a mapped reaction-type enum. Use these fields:

| Database column | Prisma field | Storage |
| --- | --- | --- |
| `id` | `id` | UUID primary key with `private.uuid_v7()` default |
| `space_id` | `spaceId` | Required UUID |
| `memory_id` | `memoryId` | Required UUID |
| `reacted_by_member_id` | `reactedByMemberId` | Required UUID |
| `reaction_type` | `reactionType` | Required enum: `heart`, `laugh`, `cry`, `star` |
| `created_at` | `createdAt` | Required `timestamptz(6)`, insertion default |
| `updated_at` | `updatedAt` | Required `timestamptz(6)`, updated on change |

Name the membership relation `reactedByMember`, matching the meaning of the agreed column and the existing `createdByMember` convention. Use a unique constraint on `(reacted_by_member_id, memory_id)` and an index on `memory_id`.

Composite foreign keys reference `memories(id, space_id)` and `space_members(id, space_id)`. Reactions are dependent records: physical deletion of either referenced record cascades to its reactions; composite-key updates use `NoAction`, following existing same-space relation conventions. Normal soft deletion leaves the reaction rows stored but excludes them from reads and blocks further mutations.

Do not store `user_id`, separate counters, or `deleted_at` on reactions. Membership already identifies the reacting user and current display name. Selecting the current type removes its row. A dedicated history or counter table would add synchronization work without serving this feature.

### 2. Share a single summary contract

Export `MEMORY_REACTION_TYPES`, `MemoryReactionType`, and `MemoryReactionSummary` from `@leonly/utils/contracts`. The summary has `counts: Record<MemoryReactionType, number>`, `currentReaction: MemoryReactionType | null`, and `members: Record<MemoryReactionType, string[]>`.

Always populate all four map keys. Count only active reacting memberships in the authorized space and use their current display names, sorted ascending within each type. Do not deduplicate equal names: two different memberships may have the same display name. Counts represent persisted reaction rows, not distinct names.

Extend shared `MemoryDetail` with required `reaction: MemoryReactionSummary`. Parent detail and standalone operations reuse the same summary calculation. Related and list summaries retain their existing shape. Never convert a summary lookup failure into zero counts.

This retains the existing UI's data needs without maintaining parallel frontend/server reaction types or issuing a separate initial browser summary request.

### 3. Authorize and serialize toggles inside the memories module

Add a focused reaction controller/service under the memories module and register it with the existing module. Public routes include the application's `/api` prefix:

| Method and route | Input | Success |
| --- | --- | --- |
| `GET /api/memories/:memoryId/reactions` | Memory UUID | HTTP 200, `ApiResponse<MemoryReactionSummary>` |
| `POST /api/memories/:memoryId/reactions` | Memory UUID and `{ reactionType }` | HTTP 200, same envelope |

Use the existing auth guard and active-membership service. The body accepts no owner, user, or space fields; normal DTO validation rejects unknown fields. Authentication failures use 401, invalid bodies use 400, and unavailable membership/memory outcomes use the same generic 404. Malformed reaction-route UUIDs also map to that 404, as required by the existing reaction privacy boundary. Responses use `Cache-Control: no-store`; Swagger documents these contracts.

For a mutation, resolve membership, start a transaction, lock the target memory row, and recheck the memory, active space, and authenticated membership within the transaction before changing a reaction. Acquire the parent lock before reading the member's existing reaction. A parent row exists even for the first reaction, so this closes the absent-row race that locking only a reaction row cannot prevent.

Apply insert, update, or delete and calculate the response summary using the same transaction. A failed transaction rolls back the mutation. Unique and same-space constraints remain defense in depth. Keep database conflict handling bounded and consistent with existing API transaction patterns; never return a success until commit succeeds.

Serializing all reaction writes to one memory is simpler than per-member advisory locking and adequate for the project's one-or-two-member spaces. It does not lock unrelated memories. The response represents that committed transaction, not a guarantee that no later request can change the memory's reactions.

### 4. Seed the reaction control from detail and reconcile through the API

Compose the shared reaction summary into both authorized detail responses. Wire `MemoryReactions` into the existing reaction slot on Timeline and Vault pages. Preserve the current visual system and other unsupported extension boundaries.

Replace the hook's fetch to the legacy Next.js route with the existing credentialed Axios client targeting NestJS and consuming shared `ApiResponse` types. Reuse the existing per-memory reaction query key and seed the authoritative client state from the detail summary without an immediate duplicate GET. Subsequent detail refreshes must update that confirmed state.

While pending, serialize and disable that control. On success, use the returned summary to confirm selection, counts, and names, then refetch through the summary endpoint to reconcile later writes. On recoverable failure, roll back optimism, announce the failure, and attempt a summary refresh. A failed refresh must not fabricate empty counts or hide the failure. Route 401 through the application's authentication recovery; on 404 refresh the detail route so its current authorization determines the generic unavailable screen.

Explicitly disable automatic retries for the POST. Toggle is non-idempotent: if a committed response is lost, repeating the same POST can undo the user's action. Recover with GET; a later deliberate selection is a new user action. No realtime convergence is promised; clients see later partner changes when they refetch or refresh.

### 5. Retire only superseded reaction paths

Trace the retained Supabase reaction service, input validator, Next.js reaction route, legacy detail helpers, and tests before removal. Update retained callers to the current backend or remove them only when unused. No current reaction path may fall back to Supabase. Preserve unrelated legacy editor, comment, and memory-mutation paths and historical SQL migrations.

## Risks / Trade-offs

- **Per-memory serialization adds contention** → Keep the transaction short and local to reaction data; the space membership limit makes this preferable to more locking infrastructure.
- **A response may precede a later overlapping mutation** → Return the transaction's summary and reconcile after settlement and on refresh; do not claim realtime cross-client consistency.
- **Mixed API/frontend deployments use different contracts** → Deploy the additive schema first, the extended API second, and the consuming frontend last. Retire legacy runtime paths with the migrated frontend.
- **Mocked tests cannot prove PostgreSQL lock scheduling** → Test application behavior and transaction boundaries in API-owned tests, inspect the migration and lock query, and disclose the lack of live-database concurrency verification unless an approved environment is exercised. Do not introduce a database test suite.

## Migration Plan

1. Add and inspect a forward Prisma migration and regenerate the shared client. Do not run a live migration as part of authoring this change.
2. Implement shared contracts, API endpoints, transaction handling, detail composition, and OpenAPI documentation.
3. Migrate frontend callers, restore the control on both detail pages, and remove superseded reaction-only code.
4. Run focused behavior tests and the repository's sequential backend and frontend verification gates listed in `tasks.md`.
5. For release, apply the schema migration, deploy the API, then deploy the frontend. The new reaction table starts empty and legacy reactions remain untouched.

Rollback the frontend before rolling back the API if needed. Leave the additive table and collected reactions intact; dropping it would lose newly created data. Do not reverse the migration or import legacy rows during rollback.
