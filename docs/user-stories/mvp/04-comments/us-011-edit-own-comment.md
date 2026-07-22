# US-011: Edit Own Comment

**Priority:** Must<br>
**Depends on:** US-010, US-025

## User Story

As an active member who authored a comment, I want to edit its text so I can correct or clarify what
I shared without changing its ownership.

## Intended Outcome

The authenticated author can update an active comment on an active visible or Vault memory in their
active space. Other members may read the result but cannot perform the mutation.

## Scope

- Author-only edit, save, cancel, pending, validation, success, and failure states.
- Refresh of the rendered comment after a successful save.

## Business Rules

- Reuse the trimmed, required, 1,000-character comment validation from US-010 on client and server.
- The edit control is shown only to the author, but server authorization and RLS enforce ownership
  using the authenticated membership rather than submitted owner data.
- Editing changes only comment text and update metadata; it does not change author, memory, space, or
  creation time.
- Soft-deleted comments and comments on soft-deleted, inactive, or inaccessible memories return the
  generic not-found outcome.
- Cancel leaves persisted text unchanged. Save failure preserves the prior persisted comment and the
  attempted edit so the author can retry or cancel.
- Edit controls and validation are keyboard accessible, focus remains predictable, and asynchronous
  feedback is announced.

## Acceptance Criteria

- Authors can enter edit mode, save valid text, or cancel without changing persisted text.
- Comments authored by the other active member expose no edit action; forged updates return the
  generic not-found outcome without revealing ownership.
- Empty, whitespace-only, and over-limit edits are rejected without discarding the attempted text.
- A successful edit updates the shared view; failure leaves the prior comment authoritative and
  provides a retry path.
- Unauthenticated, inactive-member, cross-space, soft-deleted-comment, and soft-deleted-memory
  requests do not reveal whether the target exists.

## Decision Required

- Define conflict behavior when the same comment is edited concurrently from multiple clients, such
  as last-write-wins or optimistic concurrency with a conflict response.

## Verification Notes

- Test save, cancel, validation boundaries, pending state, failure recovery, and the chosen conflict
  behavior.
- Test author, non-author, inactive-member, cross-space, soft-deleted-comment, and memory-state paths.
- Test keyboard operation, associated validation, focus, and announced asynchronous feedback.
