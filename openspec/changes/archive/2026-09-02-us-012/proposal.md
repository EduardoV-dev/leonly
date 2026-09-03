## Why

Comment authors need a reliable way to remove text they no longer want shared, without exposing
comment existence or ownership to unauthorized members. The existing comment lifecycle already
excludes soft-deleted comments from reads and counts, so author-owned deletion completes that
product contract.

## What Changes

- Add an author-only comment deletion mutation that soft-deletes an active, accessible comment.
- Add a destructive confirmation flow with pending, cancellation, success, and retryable failure
  states.
- Reconcile successful deletion in comment history and derived counts, including delete races with
  concurrent edits or indeterminate responses.
- Enforce ownership and target availability through authenticated membership and RLS while returning
  one generic unavailable outcome for inaccessible targets.

## Capabilities

### New Capabilities
- `comment-deletion`: Author-owned soft deletion of comments with secure availability handling and
  accessible confirmation feedback.

### Modified Capabilities
- `memory-comments`: Extend the comment lifecycle and author controls with deletion behavior.

## Impact

- Affects the comment API, Supabase/RLS mutation path, comment query cache, memory-detail comment
  controls, localized feedback, and integration tests.
- Reuses the existing `deleted_at` retention lifecycle; no new external dependency or public API is
  required.
