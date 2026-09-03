## Context

See `proposal.md` and `specs/memory-reactions/spec.md`. Memory Timeline and Vault cards already provide
independent count and action extension regions, while the shared detail renderer already provides a reaction
extension region. The memory feature has server-side available-memory resolution, active-space authorization,
Supabase migrations/RPCs, and TanStack Query cache invalidation patterns used by comments and edits.

## Goals / Non-Goals

**Goals:**
- Store one current reaction per active membership and memory with an authoritative count projection.
- Reuse the shared reaction control and reconcile its state after every local mutation.
- Preserve generic unavailable behavior, active-space isolation, and independently interactive card controls.
- Define a concrete same-member concurrency policy before implementation.

**Non-Goals:**
- Realtime partner reaction updates, reaction history, notification delivery, or custom reaction types.
- Optimistic cross-page cache surgery or client-supplied member and space selection.
- Reactions on deleted, inactive, or inaccessible memories.

## Decisions

### Use one private reaction row keyed by membership and memory

Add a private reaction table with a UUID identity, `membership_id`, `memory_id`, constrained reaction type,
timestamps, and a unique `(membership_id, memory_id)` constraint. A security-definer RPC, with a fixed
`search_path`, validates the authenticated caller's available membership and available target memory inside
one transaction, then inserts, updates, or deletes the row and returns a summary for all supported types.

This makes the database the final owner of the one-reaction invariant and prevents forged owner or space
payloads from influencing persistence. RLS stays enabled with no direct browser write path, and RPC execution
is restricted to the server role.

Alternative considered: a `(memory_id, user_id, reaction_type)` table with application-enforced uniqueness.
Rejected because membership, not global user identity, establishes active-space authority and application-only
checks race under concurrent clients.

### Return a projection that combines confirmed selection and fixed reaction counts

Extend authorized Timeline, Vault, and detail read models with a reaction summary: the caller's nullable
current type and counts for `heart`, `laugh`, `cry`, and `star`, including zeroes. Return the same summary
from the mutation. Counts are aggregated only after available-memory authorization and never exposed for an
unavailable target.

A fixed shape avoids UI branching for absent types and ensures cards and detail render the same contract.

Alternative considered: separate client requests for selection and counts. Rejected because it permits
inconsistent snapshots and adds request waterfalls to every memory surface.

### Make toggle semantics atomic and converge overlapping clients by completion order

The mutation accepts only a memory UUID and validated reaction type. Within one transaction it locks the
member's existing reaction for that memory, creates it when absent, replaces it when different, or removes it
when equal. Each rendered control blocks repeated activation while pending. Separate clients can still race,
so every settled mutation invalidates/refetches the reaction summary; completion order defines the persisted
final state, and no client leaves an optimistic selection authoritative after settlement.

Alternative considered: version tokens and conflict errors. Rejected because a one-row toggle has no user
authored text to preserve; serializing each operation and reconciling canonical state is simpler and meets the
story's deterministic outcome requirement.

### Keep reaction UI feature-owned and inject it through existing extension regions

Create a feature-owned reaction control that receives a memory identifier, confirmed summary, and an
unavailable callback. Use it in each Timeline/Vault card extension region and the existing detail `reactions`
slot. The control owns transient pending/error feedback while query ownership remains with the page/list/detail
data boundary. Card controls sit outside the summary link, use real buttons with selected state and visible
text/counts, and publish asynchronous feedback through the existing polite live-region pattern.

Alternative considered: duplicating controls for cards and detail. Rejected because selected semantics,
pending locking, retry behavior, and localization would drift.

### Invalidate memory projections rather than patching paginated lists

On a settled local mutation, invalidate the affected memory detail and relevant memory-list queries, then
refetch the actively rendered projection. Preserve page data until the refresh resolves on failure, restore the
last confirmed selection, and route generic unavailable responses to the current not-found boundary.

Alternative considered: optimistic updates across every cached Timeline and Vault page. Rejected because the
same memory can appear in multiple projections and a failure or concurrent completion would make rollback
fragile.

## Risks / Trade-offs

- [Concurrent same-member clients finish in an unexpected order] -> Completion order is explicitly the
  conflict rule; each client refetches canonical state after its request settles.
- [Read projections add aggregate query cost] -> Aggregate reaction counts alongside existing authorized
  memory queries and keep the type set fixed and small.
- [Refresh briefly shows older values while a partner acts] -> Realtime updates are intentionally excluded;
  local completion always reconciles from the server.
- [Generic unavailable responses are confused with routine errors] -> Preserve the existing unavailable error
  classification and transition to the shared not-found boundary before rendering stale reaction data.

## Migration Plan

1. Add the private table, uniqueness/type constraints, RLS/grants, atomic RPC, and migration tests.
2. Add authorized reaction summary reads and server route/domain tests before rendering controls.
3. Add typed client queries/mutations, shared controls, localization, and card/detail integration.
4. Verify database authorization, race reconciliation, accessibility, and all existing memory read flows.
5. Roll back by removing reaction controls and routes first; retained reaction rows are private, inactive
   product data and can be removed only through a later reviewed migration.
