## Context

The comment detail flow already has an item-level author edit control, a versioned `PATCH` mutation,
and a TanStack Query cache for cursor-paginated history. Active comment reads and counts already omit
records with a deletion timestamp. See `proposal.md` and the `memory-comments` specification for the
existing lifecycle contract.

## Goals / Non-Goals

**Goals:**
- Add one server-authorized soft-delete path that is atomic with ownership, active membership, memory
  availability, and current-version checks.
- Keep the client cache and any memory-detail count synchronized with the canonical active dataset.
- Provide an accessible confirmation and deterministic recovery for conflicts and uncertain network
  outcomes.

**Non-Goals:**
- Restore deleted comments, hard-delete retained records, or add realtime partner synchronization.
- Change comment creation, pagination size, or edit body-validation rules.

## Decisions

### Use a conditional soft-delete mutation with the current comment version

The deletion request carries the comment version rendered to the author. The server/RPC conditionally
sets `deleted_at` only when the caller is the active author in the active space, the memory is
available, the comment is active, and its version matches. Zero affected rows resolve as generic
unavailable unless an otherwise authorized active comment is found with a newer version, which is a
conflict. This prevents deleting text that changed after the author reviewed it.

Alternative considered: unconditional author deletion. Rejected because an edit/delete race could
silently remove newly edited text and leave the author unable to reconcile intent.

### Reuse the existing item route and server error contract

Add `DELETE /api/memories/:memoryId/comments/:commentId` alongside `PATCH`, validate UUID route
parameters and a strict expected-version payload, and map auth, membership, target, and ownership
failures to the existing generic 404 unavailable response. The server module owns Supabase/RPC calls;
the route owns request parsing, response mapping, and secure logging.

Alternative considered: a client-side update through exposed tables. Rejected because it weakens the
server authorization boundary and cannot safely distinguish conflict from unavailable state.

### Reconcile from the server after deletion and uncertainty

On confirmed success, remove the comment by ID from all cached history pages immediately, invalidate
the comment query, and invalidate or refresh every active-comment count consumed by the memory detail.
After an uncertain response, refetch history before offering retry: absence confirms the retained
success, while presence remains retryable. A conflict also refetches so the author sees the current
text before starting a new action.

Alternative considered: optimistic removal without reconciliation. Rejected because retries,
pagination cursors, and network loss can make the local list and counts diverge from persisted state.

### Isolate confirmation and focus ownership at the comment item

The author-only item owns dialog open state and captures the invoking control. It disables edit and
delete while the delete request is pending, uses the project's accessible dialog primitive, and
returns focus to the delete trigger on cancellation/error or a logical nearby target after success.
Parent history receives deletion outcomes to publish one polite announcement and update shared data.

Alternative considered: a page-level dialog state. Rejected because it broadens state ownership and
makes item-specific focus restoration fragile.

## Risks / Trade-offs

- A deletion can shift cursor boundaries in loaded pages -> invalidate and refetch history; honor the
  existing cursor-reset replacement behavior rather than appending stale pages.
- An indeterminate response can be either success or failure -> refetch before displaying retry and
  never announce success until absence is confirmed.
- Conditional update may need privileged relationship checks beyond RLS -> place all checks in a
  security-definer RPC with a fixed `search_path`, schema-qualified references, restricted execute
  grants, and focused RLS/forged-request tests.
- Dialog focus can target a removed element after success -> select a stable logical fallback in the
  surviving history or heading before removing the item.

## Migration Plan

1. Add the atomic deletion RPC and RLS/grant migration without changing retained comment data.
2. Add server route and tests for authorization, unavailable targets, version conflicts, and generic
   failures.
3. Add the client mutation, confirmation control, translations, cache/count reconciliation, and
   interaction tests.
4. Deploy the migration before the route/UI. Rollback by withdrawing the client and route; retained
   deletion timestamps remain valid lifecycle data and do not require reversal.
