## Purpose

Allow comment authors to permanently remove a comment from product reads while retaining the record
under the established soft-deletion data lifecycle.

## Requirements

### Requirement: Author-owned versioned comment deletion
An active member SHALL soft-delete only their own active comment or reply on an available memory in
their active space. The request MUST use `lastKnownUpdatedAt` and atomically match the server-owned
timestamp. Successful deletion records a deletion timestamp, advances the update timestamp, and retains
the stored body, author, memory, and creation timestamp.

#### Scenario: Author deletes an active comment
- **WHEN** the author confirms deletion with the current timestamp
- **THEN** the system records a deletion timestamp and returns a successful deletion outcome

#### Scenario: Non-author attempts deletion
- **WHEN** another active member requests deletion
- **THEN** the system makes no change and returns the generic not-found outcome without revealing
  ownership

#### Scenario: Comment or memory is unavailable
- **WHEN** the target is missing, inactive, deleted, cross-space, or inaccessible
- **THEN** the system makes no change and returns the generic not-found outcome without exposing
  target state

#### Scenario: Concurrent edit is detected
- **WHEN** the authorized author deletes an active comment with a stale timestamp
- **THEN** the system makes no change and returns a conflict outcome only to that authorized author

### Requirement: Reconciled comment deletion outcome
The interface SHALL require confirmation and prevent conflicting actions while deletion is pending.
On success it MUST reconcile history and counts, preserve eligible root placeholders, announce the
outcome, and restore focus logically. Recoverable failures MUST keep the comment visible and offer
retry; uncertain outcomes MUST be reconciled from authoritative state.

#### Scenario: Author cancels confirmation
- **WHEN** the author dismisses the confirmation
- **THEN** the interface sends no deletion request and the comment remains unchanged

#### Scenario: Deletion succeeds
- **WHEN** the server confirms deletion
- **THEN** a reply or root without visible replies disappears, while a root with visible replies
  becomes a placeholder; counts and focus are reconciled and success is announced

#### Scenario: Deletion fails recoverably
- **WHEN** a deletion fails for a recoverable reason
- **THEN** the interface keeps the comment visible, reports a retryable error, and does not claim
  deletion succeeded

#### Scenario: Deletion response is indeterminate
- **WHEN** a deletion ends without a reliable outcome
- **THEN** the interface refreshes authoritative state and treats a deleted placeholder or absence as
  success, otherwise offering retry

### Requirement: Deleted root preserves replies

A deleted root with visible replies SHALL display a localized "Comment deleted" placeholder without its
body or author actions. Its visible replies remain readable; editing and creating new replies under that
root are prohibited. A root with no visible replies SHALL be omitted.

#### Scenario: Root with replies is deleted
- **WHEN** an author deletes a root with visible replies
- **THEN** members see the placeholder and can retrieve existing replies without seeing deleted content

#### Scenario: Last visible reply is deleted
- **WHEN** the last visible reply under a deleted root is deleted
- **THEN** the root placeholder no longer appears after reconciliation

### Requirement: Accessible destructive comment deletion control
The interface SHALL expose the delete action only for comments authored by the authenticated member.
The confirmation dialog MUST have a clear destructive accessible name and description, trap and
manage keyboard focus while open, support keyboard dismissal, return focus predictably when closed,
and announce asynchronous results without relying on color alone.

#### Scenario: Author confirms deletion by keyboard
- **WHEN** a comment author opens the confirmation dialog, navigates it by keyboard, and confirms
  deletion
- **THEN** deletion completes without pointer input and focus moves predictably after the dialog closes

#### Scenario: Another member reads a comment
- **WHEN** a member views a comment authored by their partner
- **THEN** the comment exposes no delete action
