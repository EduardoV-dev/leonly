# US-007: Move Memory to Private Vault

**Priority:** Must


**Depends on:** US-003, US-008, US-025

## User Story

As an active member, I want to move a memory to the shared Private Vault so it is hidden from the timeline but remains available to both members of our active space.

## Intended Outcome

Either active member can move an active, visible memory in the active space to the shared Private Vault. Success changes only the memory's placement: it leaves the timeline, appears in the Vault, and retains its detail, photos, metadata, comments, reactions, and creator.

## Scope

- Move action for active, visible memories from surfaces where memory actions are available.
- Pending, success, recoverable failure, and affected-view refresh behavior.

## Business Rules

- The Private Vault is shared by both active members and is not a security boundary between them.
- Moving changes the memory from visible to hidden; it does not delete the memory or related data.
- Both active members retain detail, comment, reaction, edit, delete, and restore access after the move.
- Missing, inactive, already hidden, soft-deleted, and inaccessible memories cannot be moved and produce the same generic not-found outcome.
- A failed move leaves the memory visible in the timeline and absent from the shared Private Vault.
- While the move is pending, repeated activation does not start another move request.

## Acceptance Criteria

- The move action is available only for an active, visible memory in the active space.
- Either active member can move the memory to the shared Private Vault.
- After success, the memory leaves the timeline, appears in the shared Private Vault, and remains openable by both active members.
- Photos, metadata, comments, reactions, and creator remain unchanged.
- A failed move leaves prior placement and data unchanged and shows a recoverable error.
- Missing, inactive, already hidden, soft-deleted, and inaccessible memories produce the same generic not-found outcome.
- Repeated activation while pending results in at most one successful move.

## Decision Required

- Define the destination and success feedback after a move initiated from timeline or detail.
- Define conflict behavior when a move overlaps an edit, delete, restore, comment, or reaction request.

## Verification Notes

- Verify successful move by either active member, affected-view refresh, authorized detail access, and preservation of related data.
- Verify failed moves leave prior state unchanged and provide retryable feedback.
- Verify pending duplicate activation, decided conflict behavior, and generic not-found behavior for repeat, missing, inactive, soft-deleted, and inaccessible requests.
