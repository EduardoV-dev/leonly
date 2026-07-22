# US-009: Restore Memory from Private Vault

**Priority:** Must


**Depends on:** US-008, US-025

## User Story

As an active member, I want to restore a memory from the shared Private Vault so it appears again in our active space's timeline.

## Intended Outcome

Either active member can restore an active, hidden memory in the active space. Success changes only the memory's placement: it leaves the shared Private Vault, returns to its chronological position in the timeline, and retains its detail, photos, metadata, comments, reactions, and creator.

## Scope

- Restore action for active, hidden memories from surfaces where memory actions are available.
- Pending, success, recoverable failure, and affected-view refresh behavior.

## Business Rules

- Restoring changes the memory from hidden to visible; it does not recreate or otherwise alter the memory.
- Timeline position is determined by the timeline's memory-date ordering, not by restore time.
- Missing, inactive, already visible, soft-deleted, and inaccessible memories cannot be restored and produce the same generic not-found outcome.
- A failed restore leaves the memory hidden in the shared Private Vault and absent from the timeline.
- While restore is pending, repeated activation does not start another restore request.

## Acceptance Criteria

- The restore action is available only for an active, hidden memory in the active space.
- Either active member can restore the memory to the timeline.
- After success, the memory leaves the shared Private Vault and appears in the timeline according to its memory date.
- Photos, metadata, comments, reactions, and creator remain unchanged.
- A failed restore leaves prior placement and data unchanged and shows a recoverable error.
- Missing, inactive, already visible, soft-deleted, and inaccessible memories produce the same generic not-found outcome.
- Repeated activation while pending results in at most one successful restore.

## Decision Required

- Define the destination and success feedback after a restore initiated from the shared Private Vault or detail.
- Define conflict behavior when a restore overlaps an edit, delete, move, comment, or reaction request.

## Verification Notes

- Verify successful restore by either active member, chronological timeline placement, affected-view refresh, and preservation of related data.
- Verify failed restores leave prior state unchanged and provide retryable feedback.
- Verify deletion and other decided mutation races, pending duplicate activation, and generic not-found behavior for repeat, missing, inactive, soft-deleted, and inaccessible requests.
