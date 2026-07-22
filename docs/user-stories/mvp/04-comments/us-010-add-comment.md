# US-010: Add Comment to Memory

**Priority:** Must<br>
**Depends on:** US-025, US-028

## User Story

As an active member, I want to comment on a memory in my active space so I can add context or
meaning to a shared moment.

## Intended Outcome

An active member can read and add comments on an active visible or Vault memory. A successful
submission becomes part of the shared comment history and identifies the author by their current
membership display name.

## Scope

- A comment composer and a newest-first, cursor-paginated comment list on memory detail.
- Author display name, creation timestamp, loading, empty, load-more, submission, and error states.
- Refresh after local comment actions; realtime partner updates are outside MVP.

## Business Rules

- Comment text is required after trimming and is limited to 1,000 characters.
- The server derives the author and active space from the authenticated membership; submitted owner
  or space identifiers are not trusted.
- Either active member may comment on an active visible or Vault memory in their active space.
- Missing, soft-deleted, inactive, and inaccessible memories return the generic not-found outcome.
- Soft-deleted comments are excluded from lists and counts.
- Comments are ordered by creation timestamp descending, then a deterministic ID order, using
  bounded cursor pagination.
- Submission is disabled while pending. Failure preserves the entered text and provides a retry path.
- The composer has an accessible label, validation is associated with the field, and asynchronous
  success or failure is announced without relying on color.

## Acceptance Criteria

- Valid comments appear after successful submission with the author's current membership display
  name and creation timestamp.
- Initial and load-more requests return deterministic pages without duplicate or skipped comments.
- Empty, whitespace-only, and over-limit comments are rejected without losing valid draft text.
- Unauthenticated, inactive-member, cross-space, and soft-deleted-memory requests cannot create or
  expose comments.
- Loading, empty, pending, and error states are understandable, keyboard accessible, and retryable.

## Decision Required

- Define the bounded comment page size, ID direction, cursor fields, and stale or invalid cursor
  behavior.
- Decide whether server-side idempotency is required for retries or submissions from multiple clients,
  beyond disabling the local form while a request is pending.

## Verification Notes

- Test validation boundaries, deterministic pagination, double submission, retry behavior, and counts.
- Test visible and Vault memories, soft-deleted records, inactive membership, and cross-space access.
- Test keyboard submission, field-associated errors, focus behavior, and announced async feedback.
