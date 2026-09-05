## Purpose

Allow either active member to rename the shared space safely while validating input, preventing
silent concurrent overwrites, and keeping every rendered space identity consistent.

## Requirements

### Requirement: Membership-derived rename authorization
The system SHALL allow either active member to rename their active space, SHALL derive the target
space and acting member from the authenticated session, and SHALL accept no client-selected space,
member, owner, or user identifier.

#### Scenario: First active member renames the space
- **WHEN** an authenticated active member submits a valid rename for the membership-derived space
- **THEN** the system applies the rename without requiring creator or owner status

#### Scenario: Second active member renames the space
- **WHEN** the other authenticated active member submits a valid rename for the same active space
- **THEN** the system applies the rename with the same authorization as the first member

#### Scenario: Active membership is unavailable
- **WHEN** the requester is unauthenticated or their membership, profile, or active space is missing,
  inactive, soft-deleted, or inaccessible
- **THEN** the system performs no mutation and returns an authentication or generic unavailable
  outcome without exposing protected space or member data

#### Scenario: Request attempts to select a resource
- **WHEN** a rename request includes an altered space, membership, owner, or user identifier
- **THEN** the system ignores or rejects that identifier and never uses it to select the mutation
  target

### Requirement: Space-name validation
The system SHALL trim the submitted name, require between 2 and 100 characters after trimming, and
enforce the same limits at client and server trust boundaries.

#### Scenario: Valid name contains surrounding whitespace
- **WHEN** an active member submits a name whose trimmed value contains 2 to 100 characters
- **THEN** the system persists and displays the trimmed value

#### Scenario: Name is empty or whitespace only
- **WHEN** an active member submits an empty or whitespace-only name
- **THEN** the system rejects the rename, associates the validation message with the name field, and
  preserves the attempted input

#### Scenario: Name is outside the length limits
- **WHEN** the trimmed name contains fewer than 2 or more than 100 characters
- **THEN** the system rejects the rename without changing the persisted name or discarding the
  attempted input

### Requirement: Optimistic rename concurrency
The system SHALL require the canonical space revision observed when editing begins, SHALL update the
name only when that revision is still current, and SHALL return a conflict without overwriting a newer
rename when the revision is stale.

#### Scenario: Revision remains current
- **WHEN** an active member saves a valid name with the current canonical revision
- **THEN** the system atomically updates the name and returns the new canonical name and revision

#### Scenario: Other member renames first
- **WHEN** an active member saves with a revision that became stale after another successful rename
- **THEN** the system returns HTTP `409`, preserves the attempted name for retry, and provides the
  current canonical name and revision to the still-authorized member

#### Scenario: Member resolves a conflict
- **WHEN** the member accepts the refreshed canonical name or retries the preserved draft against the
  refreshed revision
- **THEN** the interface either exits editing with the canonical value or submits a new explicit
  rename attempt without silently overwriting it

### Requirement: Rename interaction states
The system SHALL provide explicit edit, cancel, save, pending, success, validation, conflict, and
recoverable failure states while preventing duplicate local submissions.

#### Scenario: Member cancels editing
- **WHEN** the member changes the draft and activates cancel
- **THEN** the interface exits editing, restores the persisted canonical name, and performs no
  mutation

#### Scenario: Rename is pending
- **WHEN** a valid rename request is in flight
- **THEN** conflicting controls are disabled, duplicate submission is prevented, and pending feedback
  is announced

#### Scenario: Rename succeeds
- **WHEN** the server confirms the rename
- **THEN** the interface exits editing, announces success, and displays the returned canonical name

#### Scenario: Rename fails unexpectedly
- **WHEN** the rename request fails for a recoverable non-conflict reason
- **THEN** the interface preserves the attempted name, keeps an explicit retry path, and continues to
  identify the previously persisted canonical name

### Requirement: Canonical name refresh
The system SHALL reconcile every currently rendered active-space name consumer after a successful
rename without requiring navigation, reauthentication, or realtime synchronization.

#### Scenario: Settings rename succeeds
- **WHEN** a member successfully renames the space from Settings
- **THEN** Settings, dashboard content, desktop navigation, and mobile navigation use the new canonical
  name after the authoritative refresh

#### Scenario: Later page load follows a rename
- **WHEN** either active member loads an active-space page after a successful rename
- **THEN** every displayed space identity uses the persisted canonical name

### Requirement: Accessible and responsive rename controls
The system SHALL give every rename control an accessible name, associated validation, keyboard
operation, visible focus, predictable post-action focus, and announced non-color feedback across
supported mobile and desktop viewports.

#### Scenario: Member renames with a keyboard
- **WHEN** a member edits, validates, cancels, resolves a conflict, or saves using only a keyboard
- **THEN** controls remain in logical order and focus moves to or remains on the relevant field,
  initiating action, conflict recovery, or updated value

#### Scenario: Rename controls reflow on mobile
- **WHEN** the shared Settings section is displayed on a supported narrow viewport
- **THEN** the field, validation, and actions remain readable and operable without clipping or
  collision with fixed navigation and safe-area insets
