## Why

Either active member needs a deliberate way to remove a memory that should no longer be shared while
preserving the MVP retention policy and the product's non-enumerating privacy boundary. The persisted
memory lifecycle and all read surfaces already recognize soft-deleted records, so this change completes
that lifecycle with a secure, recoverable deletion flow.

## What Changes

- Add an active-member memory deletion mutation that conditionally soft-deletes an available memory in
  the member's active space without removing retained records or media.
- Add an accessible destructive confirmation flow only to direct Timeline and shared Private Vault detail
  views, with cancellation, single-flight pending, success, and retryable failure states.
- Reconcile successful deletion across Timeline, Vault, dashboard projections, detail, comments,
  reactions, counts, aggregates, and private-media access.
- Resolve overlapping edit, move, restore, comment, reaction, and repeated-delete requests through an
  atomic versioned lifecycle boundary and generic unavailable outcomes after deletion commits.

## Capabilities

### New Capabilities
- `memory-deletion`: Active-member soft deletion of shared memories with confirmation, concurrency,
  cross-surface reconciliation, retained-data privacy, and accessible outcome feedback.

### Modified Capabilities

- `memory-lifecycle`: Replace browser-exposed signed photo URLs with per-request authorized media
  delivery so deletion revokes retained media immediately.
- `memories-timeline`: Consume revocable authorized cover delivery instead of signed cover URLs.
- `private-vault`: Consume revocable authorized cover delivery instead of signed cover URLs.
- `memory-detail`: Deliver every photo through the revocable authorization boundary.
- `memory-editing`: Deliver retained-photo previews through the revocable authorization boundary.

## Impact

- Affects the memory mutation API and server module, Supabase lifecycle RPC and grants, memory query
  caches, direct detail action regions, dashboard projections, localization, and integration tests.
- Reuses the existing `memories.deleted_at`, memory version token, private Storage bucket, generic
  unavailable response, accessible dialog/toast patterns, and TanStack Query invalidation model.
- Replaces browser-facing Supabase signed photo URLs with same-origin authorized media responses; this is
  required because an issued Storage signed URL cannot be revoked before expiry.
- Adds no external dependency and does not hard-delete retained memory, photo, comment, or reaction data.
