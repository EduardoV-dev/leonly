# US-012: Delete Own Comment

**Status:** Planned  
**Priority:** Must  
**OpenSpec:** Not created  
**Depends on:** US-010, US-025

## User Story

As a comment author, I want to delete my own comment so I can remove something I no longer want visible.

## Intended Outcome

After confirmation, only the author can soft-delete their active comment by setting `is_active = false`.

## Business Rules

- Do not allow one member to delete the other member's comment.
- The operation is idempotent and deleted comments never appear in counts or lists.

## Acceptance Criteria

- [ ] Author confirmation is required and cancellation changes nothing.
- [ ] Successful deletion removes the comment from visible lists and counts.
- [ ] Non-author, cross-space, and deleted-memory requests are denied.
- [ ] Failure leaves the comment visible and reports a safe error.

## Verification

- [ ] Test confirmation, author-only enforcement, repeat delete, and count updates.
