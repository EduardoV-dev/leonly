## Purpose

Allow an active member to safely manage the name attached to their current space membership while
preserving authorization, current historical attribution, and recoverable concurrent edits.

## ADDED Requirements

### Requirement: Membership-derived self-update authorization
The system SHALL allow an authenticated member to update only the display name of their own active
membership. It MUST derive the user, membership, and space from the authenticated session and MUST
NOT accept a membership, user, space, role, or ownership value as mutation authority. Missing,
inactive, deleted, cross-space, and otherwise inaccessible membership states MUST produce the same
generic unavailable outcome without exposing membership data.

#### Scenario: Active member updates their own display name
- **WHEN** an authenticated member submits a valid update for their active membership
- **THEN** the system changes only that membership's display name

#### Scenario: Payload attempts to select another identity
- **WHEN** a request includes or alters a membership, user, space, role, or ownership value
- **THEN** the system does not use that value to select the target and changes no other membership

#### Scenario: Current membership is unavailable
- **WHEN** the authenticated user has no accessible active membership at mutation time
- **THEN** the system changes no membership and returns the generic unavailable outcome

### Requirement: Normalized display-name validation
The system SHALL trim leading and trailing whitespace and accept a display name only when the
normalized value contains between 2 and 100 Unicode characters inclusive. Client validation SHALL
improve feedback but MUST NOT replace server and persisted-data validation. Invalid input MUST leave
the persisted name unchanged and remain available in the interface for correction.

#### Scenario: Valid padded name is submitted
- **WHEN** a member submits a display name whose trimmed value contains 2-100 Unicode characters
- **THEN** the system stores and returns the trimmed value

#### Scenario: Empty or whitespace-only name is submitted
- **WHEN** a member submits a value that is empty after trimming
- **THEN** the system rejects it, preserves the attempted value, and leaves the persisted name unchanged

#### Scenario: Name is below the minimum
- **WHEN** a member submits a trimmed display name containing fewer than 2 Unicode characters
- **THEN** the system rejects it, preserves the attempted value, and identifies the minimum

#### Scenario: Name exceeds the maximum
- **WHEN** a member submits a trimmed display name containing more than 100 Unicode characters
- **THEN** the system rejects it, preserves the attempted value, and identifies the maximum

### Requirement: Optimistic concurrency for display-name updates
The system SHALL condition each update on the server-owned membership revision the member originally
read. If the stored revision differs, the system MUST preserve the newer persisted value, return the
current canonical display name and revision only to the still-authorized member, and require explicit
reconciliation before another update. It MUST NOT silently overwrite a concurrent update.

#### Scenario: Update uses the current revision
- **WHEN** an authorized member submits a valid display name with the current membership revision
- **THEN** the system stores the normalized name and returns it with a new server-owned revision

#### Scenario: Concurrent update is detected
- **WHEN** an authorized member submits a valid display name with an outdated membership revision
- **THEN** the system makes no change and returns the current canonical name and revision while the
  interface preserves the attempted name

#### Scenario: Member accepts the concurrent value
- **WHEN** a member chooses the current canonical value after a conflict
- **THEN** the interface discards only the attempted value and displays the current persisted name

#### Scenario: Member retries after reviewing a conflict
- **WHEN** a member explicitly retries the preserved attempted name against the returned current revision
- **THEN** the system evaluates it as a new optimistic update rather than silently applying the stale request

### Requirement: Current attribution without authored-record rewrites
The display name SHALL remain owned by the membership. Authorized reads that identify an author or
creator through that membership MUST resolve its current display name rather than a copied name on an
authored record. A display-name update MUST NOT rewrite comments, memories, place metadata, or other
authored records.

#### Scenario: Historical content is refreshed after a name update
- **WHEN** an authorized view refreshes a comment, memory, or other authored content after its
  author's membership display name changes
- **THEN** the view shows the current membership display name

#### Scenario: Display name is updated
- **WHEN** an active membership display name changes successfully
- **THEN** authored record identities, content, timestamps, and ownership remain unchanged

### Requirement: Recoverable and accessible display-name editor
The interface SHALL provide an explicit label, field-associated validation, keyboard-operable edit,
save, cancel, conflict, and retry actions, predictable focus, and announced asynchronous feedback.
It SHALL permit at most one in-flight request, prevent editing while that request is pending, preserve
the attempted value on conflict or failure, and use the returned canonical value after success. Cancel
MUST change no persisted state.

#### Scenario: Member cancels editing
- **WHEN** a member cancels an in-progress edit
- **THEN** the interface restores the canonical name, exits editing, and sends no update

#### Scenario: Duplicate save is attempted
- **WHEN** a member activates save again while an update is pending
- **THEN** the interface sends no additional update and communicates the pending state

#### Scenario: Update succeeds
- **WHEN** the server accepts a display-name update
- **THEN** the interface displays the returned canonical name, exits editing, announces success, and
  refreshes authoritative membership-backed views

#### Scenario: Update fails recoverably
- **WHEN** an update fails for a reason other than validation, conflict, or membership unavailability
- **THEN** the interface preserves the attempted name, announces a generic failure, and permits retry

#### Scenario: Keyboard member corrects a validation error
- **WHEN** a keyboard member submits an invalid name, corrects it, and saves
- **THEN** validation is associated with the field, all actions remain keyboard operable, and focus
  remains predictable throughout the workflow
