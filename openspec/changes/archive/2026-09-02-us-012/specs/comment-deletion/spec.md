## Purpose

Allow comment authors to permanently remove a comment from product reads while retaining the record
under the established soft-deletion data lifecycle.

## ADDED Requirements

### Requirement: Author-owned versioned comment deletion
The system SHALL allow an authenticated active member to soft-delete an active comment they authored
on an available Timeline or shared Private Vault memory in their active space. It MUST derive the
member, author, space, comment, and memory access from the authenticated session and MUST NOT trust
client-supplied identity or ownership values. The delete request MUST be conditioned on the
server-owned comment version read by the author and, on success, MUST record a deletion timestamp
without altering the retained comment body, author, memory, or creation timestamp.

#### Scenario: Author deletes an active comment
- **WHEN** a comment author confirms deletion with the current comment version
- **THEN** the system records a deletion timestamp and returns a successful deletion outcome

#### Scenario: Non-author attempts deletion
- **WHEN** another active member submits a deletion request for a comment they did not author
- **THEN** the system makes no change and returns the generic not-found outcome without revealing
  ownership

#### Scenario: Comment or memory is unavailable
- **WHEN** a deletion targets a missing, inactive, soft-deleted, cross-space, or inaccessible comment
  or memory
- **THEN** the system makes no change and returns the generic not-found outcome without exposing
  target state

#### Scenario: Concurrent edit is detected
- **WHEN** a comment author submits deletion using an outdated comment version while the active
  comment remains otherwise available
- **THEN** the system makes no change and returns a conflict outcome only to that authorized author

### Requirement: Reconciled comment deletion outcome
The interface SHALL require explicit confirmation before requesting deletion and SHALL leave the
comment unchanged when the author cancels. While deletion is pending, it MUST prevent duplicate
deletion and conflicting author actions for that comment and communicate progress. On success, it
MUST remove the comment from rendered history, reconcile affected derived counts, refresh local
comment data, return focus to the invoking control or a logical surviving target, and announce the
outcome. On a recoverable failure, it MUST keep the comment visible and offer retry.

#### Scenario: Author cancels confirmation
- **WHEN** a comment author dismisses the deletion confirmation without accepting it
- **THEN** the interface sends no deletion request and the comment remains unchanged

#### Scenario: Deletion succeeds
- **WHEN** the server confirms a comment deletion
- **THEN** the comment disappears from the history and count after reconciliation, focus remains
  predictable, and success is announced

#### Scenario: Deletion fails recoverably
- **WHEN** a deletion request fails for a reason other than comment or memory unavailability
- **THEN** the interface keeps the comment visible, reports a retryable error, and does not claim
  deletion succeeded

#### Scenario: Deletion response is indeterminate
- **WHEN** a deletion request ends without a reliable server outcome
- **THEN** the interface refreshes comment history before presenting retry, treats absence of the
  comment as success, and otherwise leaves the visible comment available for retry

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
