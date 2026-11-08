## MODIFIED Requirements

### Requirement: Author-owned versioned comment deletion

An active member SHALL soft-delete only their own active comment or reply on an available memory in their active space. The request MUST use `lastKnownUpdatedAt` and atomically match the server-owned timestamp. Successful deletion records a deletion timestamp, advances the update timestamp, and retains the stored body, author, memory, and creation timestamp.

#### Scenario: Author deletes an active comment
- **WHEN** the author confirms deletion with the current timestamp
- **THEN** the system records deletion and returns a successful outcome

#### Scenario: Non-author attempts deletion
- **WHEN** another active member requests deletion
- **THEN** no change occurs and the generic not-found outcome does not reveal ownership

#### Scenario: Comment or memory is unavailable
- **WHEN** the target is missing, inactive, deleted, cross-space, or inaccessible
- **THEN** no change occurs and the generic not-found outcome exposes no target state

#### Scenario: Concurrent edit is detected
- **WHEN** the authorized author deletes an active comment with a stale timestamp
- **THEN** no change occurs and the API returns a conflict only to that author

### Requirement: Reconciled comment deletion outcome

The interface SHALL require confirmation and prevent conflicting actions while deletion is pending. On success it MUST reconcile history and counts, preserve eligible root placeholders, announce the outcome, and restore focus logically. Recoverable failures MUST keep the comment visible and offer retry; uncertain outcomes MUST be reconciled from authoritative state.

#### Scenario: Author cancels confirmation
- **WHEN** the author dismisses the confirmation
- **THEN** no request is sent and the comment remains unchanged

#### Scenario: Deletion succeeds
- **WHEN** the server confirms deletion
- **THEN** a reply or root without visible replies disappears, while a root with visible replies becomes a placeholder; counts and focus are reconciled and success is announced

#### Scenario: Deletion fails recoverably
- **WHEN** a deletion fails for a recoverable reason
- **THEN** the interface keeps the comment visible and offers retry

#### Scenario: Deletion response is indeterminate
- **WHEN** a deletion ends without a reliable outcome
- **THEN** the interface refreshes authoritative state and treats a deleted placeholder or absence as success, otherwise offering retry

## ADDED Requirements

### Requirement: Deleted root preserves replies

A deleted root with visible replies SHALL display a localized "Comment deleted" placeholder without its body or author actions. Its visible replies remain readable; editing and creating new replies under that root are prohibited. A root with no visible replies SHALL be omitted.

#### Scenario: Root with replies is deleted
- **WHEN** an author deletes a root with visible replies
- **THEN** members see the placeholder and can retrieve the existing replies without seeing deleted content

#### Scenario: Last visible reply is deleted
- **WHEN** the last visible reply under a deleted root is deleted
- **THEN** the root placeholder no longer appears after reconciliation
