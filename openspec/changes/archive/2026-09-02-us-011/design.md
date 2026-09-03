## Context

See `proposal.md` and the existing `memory-comments` specification. Comments are read through one
memory-scoped TanStack Query history and created through a service-role RPC. `memory_comments` currently
stores immutable body text and no edit version. The shared `MemoryCommentItem` is rendered by both Timeline
and Private Vault detail wrappers.

## Goals / Non-Goals

**Goals:**

- Prevent a valid author edit from silently overwriting a newer edit.
- Keep authorization and generic unavailable behavior at the database boundary.
- Preserve local work on validation, recoverable failure, and concurrency conflict.
- Reconcile successful updates in the existing paginated history without a whole-page route refresh.

**Non-Goals:**

- Comment deletion, edit history, realtime synchronization, merge UI, or partner conflict notifications.
- Reusing creation idempotency keys for edit mutations.
- Exposing comment version or internal conflict details as product copy.

## Decisions

### Store a monotonic integer version and update timestamp

Add `version integer not null default 1` and `updated_at timestamptz not null default created_at` to
`memory_comments`. An authorized edit increments the version and assigns the server timestamp in the same
transaction. Read responses include both values so the browser can condition an edit on the version it saw.

An integer version is smaller and clearer than comparing timestamps, avoids precision/serialization ambiguity,
and preserves future compatibility with a versioned mutation contract.

Alternatives considered:

- Last-write-wins would silently discard a partner's valid update.
- Timestamp comparison is sensitive to representation precision and is less explicit as a concurrency token.
- A full edit history is unnecessary for the MVP and adds retention and UI policy.

### Use one service-role conditional-update RPC

Create an RPC that accepts the authenticated user ID, comment ID, expected version, and replacement body.
It derives active membership and available parent memory from server-owned data, locks or conditionally updates
only the author row at the expected version, and returns `completed`, `conflict`, `invalid`, or `unavailable`.
The route maps unavailable to the existing generic 404 and only emits a conflict response after the RPC has
verified the caller is the active author of an available target.

Alternatives considered:

- A direct browser update relies on client authorization and broadens the exposed mutation surface.
- Read-then-write in the route leaves a race between the version check and update.
- Returning conflict for every failed update could leak whether a target exists or who owns it.

### Reconcile updates by comment identity

Extend `MemoryComment` with `updatedAt`, `version`, and an `isAuthor` capability derived server-side. A
successful update replaces the matching cached comment in every loaded page, then invalidates the existing
memory-scoped query for authoritative reconciliation. The item owns local edit mode and uses a colocated hook
for draft, validation, pending, retry, conflict, and cancel state.

Alternatives considered:

- Refetching only after success can leave stale text visible during a slow request.
- Moving every item edit state into the history component couples independent rows and increases rerender scope.
- Optimistic text mutation needs rollback logic and risks presenting a write the server later rejects.

## Risks / Trade-offs

- [An author can see a partner update only after a refresh or failed stale save] -> A conditional write prevents
  loss, successful local edits invalidate history, and conflict recovery gives an explicit refresh path.
- [A comment can be deleted while its author edits] -> The mutation returns the generic unavailable outcome and
  stale local history is removed through existing unavailable handling.
- [A paginated cache may contain the same comment in more than one page after refetch] -> Replace updates by ID
  across loaded pages and retain the existing flattened-list deduplication.

## Migration Plan

1. Add server-owned version/update metadata and the authorized conditional-update RPC, grants, and migration
   contract tests.
2. Add typed server and route boundaries that keep validation, conflict, and generic unavailable outcomes
   distinct.
3. Add author-gated editing controls and cache reconciliation to the shared comment item for both detail views.
4. Verify migration behavior, route contracts, keyboard states, conflict draft preservation, and full web-app
   gates.
5. Roll back UI and routes before schema if necessary; retain version metadata and edited text because accepted
   shared content must not be destructively reverted.
