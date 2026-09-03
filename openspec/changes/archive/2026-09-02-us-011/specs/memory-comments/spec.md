## ADDED Requirements

### Requirement: Author-owned versioned comment edits

The system SHALL allow an authenticated active member to edit the normalized plain-text body of an active
comment they authored on an available Timeline or shared Private Vault memory in their active space. The
system MUST derive the author, membership, space, comment, and memory access from the authenticated session
and MUST NOT trust client-supplied identity or ownership values. The updated value MUST meet the existing
trimmed 1-to-1,000 Unicode-character comment constraint, preserve intentional internal line breaks, and
render as inert plain text. A successful edit MUST preserve the comment identity, author, memory, creation
timestamp, and current author attribution while returning server-owned update metadata.

#### Scenario: Author updates an active comment

- **WHEN** a comment author submits a valid edit against the current version of an active accessible comment
- **THEN** the system stores the normalized text, advances its server-owned version, and returns the updated
  comment

#### Scenario: Non-author attempts an edit

- **WHEN** another active member submits an edit for a comment they did not author
- **THEN** the system makes no change and returns the generic not-found outcome without revealing ownership

#### Scenario: Edit validation fails

- **WHEN** an author submits empty, whitespace-only, or over-limit replacement text
- **THEN** the system rejects the edit without changing the persisted comment and the interface preserves the
  attempted text for correction

#### Scenario: Comment or memory is unavailable

- **WHEN** an edit targets a missing, inactive, soft-deleted, cross-space, or inaccessible comment or memory
- **THEN** the system makes no change and returns the generic not-found outcome without exposing record state

### Requirement: Optimistic concurrency for comment edits

The system SHALL condition each comment edit on the server-owned version that the author originally read.
When the current stored version differs from the submitted expected version, the system MUST make no change
and return a conflict outcome only to an otherwise authorized author. The interface MUST preserve the
author's attempted text, identify that the comment changed elsewhere, and provide a refresh or cancel path;
it MUST NOT silently overwrite the newer persisted text. A deleted or inaccessible target MUST remain
indistinguishable from other unavailable targets rather than being reported as a conflict.

#### Scenario: Concurrent edit is detected

- **WHEN** an author submits a valid replacement using an outdated comment version
- **THEN** the system preserves the newer persisted text, returns a conflict outcome, and keeps the author's
  attempted text available for reconciliation

#### Scenario: Author refreshes after a conflict

- **WHEN** an author refreshes comment history after receiving a conflict outcome
- **THEN** the interface shows the current persisted comment and allows the author to begin a new edit

#### Scenario: Author cancels an edit

- **WHEN** an author cancels an in-progress or conflicted edit
- **THEN** the interface discards only the local attempted text and leaves the persisted comment unchanged

### Requirement: Accessible author edit controls

The interface SHALL display an edit action only for comments authored by the authenticated member. Edit
controls, validation, pending feedback, conflict messaging, save, cancel, and recovery actions MUST be
keyboard operable, have clear accessible names, keep focus predictable, and announce asynchronous outcomes.
The comment history MUST reconcile a successful edit by comment identity without duplicates or stale local
text.

#### Scenario: Author edits by keyboard

- **WHEN** a comment author activates Edit with the keyboard, changes valid text, and saves
- **THEN** the edit completes without pointer input, the updated text appears once, and feedback is announced

#### Scenario: Another member reads the history

- **WHEN** a member views a comment authored by their partner
- **THEN** the comment exposes no edit control and remains readable as current persisted text
