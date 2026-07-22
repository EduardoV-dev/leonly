# US-012: Delete Own Comment

**Priority:** Must<br>
**Depends on:** US-010, US-025

## User Story

As an active member who authored a comment, I want to remove it from shared view so text I no longer
want visible is no longer presented in the product.

## Intended Outcome

After explicit confirmation, the authenticated author can soft-delete their active comment. The
comment disappears from product reads and aggregates while remaining retained under the MVP data
lifecycle contract.

## Scope

- Author-only delete action, confirmation, cancellation, pending, success, and failure states.
- Removal from comment lists and counts after successful soft deletion.

## Business Rules

- The delete action is shown only to the author, but server authorization and RLS enforce ownership
  from the authenticated membership.
- Confirmation is required before mutation; cancellation changes no state.
- A successful delete sets the comment inactive and refreshes affected lists and counts.
- Soft-deleted comments are not readable through product routes and never appear in counts or lists.
- Repeat, missing, soft-deleted, inactive, non-author, and inaccessible targets return the same
  generic not-found outcome.
- Failure leaves the comment visible and offers a safe retry path.
- The confirmation uses an accessible dialog pattern with clear destructive labeling, keyboard
  operation, managed focus, and announced results.

## Acceptance Criteria

- Author confirmation is required, and cancellation leaves the comment unchanged.
- Successful soft deletion removes the comment from visible lists and counts after refresh.
- The other active member has no delete action and cannot delete the comment through a forged request.
- Unauthenticated, inactive-member, cross-space, repeat-delete, and soft-deleted-memory requests
  return the generic not-found outcome without leaking target state.
- Failure leaves the comment visible and reports a safe, retryable error.

## Decision Required

- Define the outcome when delete races with edit or another delete, including how a lost or
  indeterminate response is reconciled.

## Verification Notes

- Test confirmation, cancellation, pending state, failure recovery, soft deletion, and count updates.
- Test author-only enforcement, repeat delete, inactive membership, memory state, and cross-space access.
- Test dialog semantics, destructive naming, keyboard operation, focus return, and announced feedback.
