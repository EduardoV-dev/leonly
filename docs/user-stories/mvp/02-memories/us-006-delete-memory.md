# US-006: Delete Memory

**Priority:** Must


**Depends on:** US-004, US-025

## User Story

As an active member, I want to delete a memory from our active space so a moment that should no longer be shared is no longer accessible.

## Intended Outcome

After explicit confirmation, either active member can soft-delete an active memory in the active space. Success removes the memory from timeline, shared Private Vault, detail, comments, reactions, aggregates, and direct access while retaining its records and media under the MVP retention policy.

## Scope

- Delete action from each memory surface where actions are available.
- Explicit confirmation, cancellation, pending, success, and recoverable failure states.
- Product and storage-route denial after a successful soft delete.

## Business Rules

- Deletion is a soft delete for MVP and does not claim permanent removal from retained storage.
- Cancelling has no effect.
- A failed delete leaves the memory active and accessible in its prior placement.
- After success, the memory and its retained photos, comments, and reactions cannot be read through product or storage routes and do not contribute to counts or aggregates.
- Missing, inactive, already soft-deleted, and inaccessible memory IDs produce the same generic not-found outcome, including repeated delete requests.
- While deletion is pending, repeated activation does not start another delete request.

## Acceptance Criteria

- Deletion requires explicit confirmation and cancellation leaves the memory unchanged.
- Either active member can soft-delete an active memory in the active space.
- After success, the memory disappears from timeline, shared Private Vault, detail, related UI, counts, and aggregates.
- After success, direct product and storage routes cannot expose the memory or retained media.
- A failed request leaves the memory unchanged and shows a recoverable error.
- Missing, inactive, already soft-deleted, and inaccessible memories produce the same generic not-found outcome.
- Repeated activation while pending results in at most one successful soft delete.

## Decision Required

- Define the destination and success feedback after deletion from timeline, shared Private Vault, and detail.
- Define conflict behavior when deletion overlaps an edit, move, restore, comment, or reaction request.

## Verification Notes

- Verify confirmation, cancellation, successful soft delete, failed deletion, and repeated activation.
- Verify removal from lists, detail, related UI, counts, aggregates, direct routes, and private media access.
- Verify retained records are not surfaced and generic not-found behavior covers repeat, missing, inactive, soft-deleted, and inaccessible requests.
- Verify decided conflict behavior for overlapping mutations.
