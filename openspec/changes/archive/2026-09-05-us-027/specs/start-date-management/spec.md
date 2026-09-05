## Purpose

Allow either active member to correct the shared date-only start date safely while applying their
local calendar boundary, preventing silent concurrent overwrites, and refreshing derived day counts.

## ADDED Requirements

### Requirement: Membership-derived start-date authorization
The system SHALL allow either active member to update their active space's start date, SHALL derive
the target space and acting member from the authenticated session, and SHALL accept no client-selected
space, membership, owner, or user identifier.

#### Scenario: Either active member updates the date
- **WHEN** either authenticated active member submits a valid update for the membership-derived space
- **THEN** the system applies it without requiring creator or owner status

#### Scenario: Active membership is unavailable
- **WHEN** the requester is unauthenticated or their membership, profile, or active space is missing,
  inactive, soft-deleted, or inaccessible
- **THEN** the system performs no mutation and returns an authentication or generic unavailable
  outcome without exposing protected space or member data

#### Scenario: Request attempts to select a resource
- **WHEN** an update request includes an altered space, membership, owner, or user identifier
- **THEN** the system ignores or rejects that identifier and never uses it to select the mutation
  target

### Requirement: Browser-local date validation
The system SHALL require a real date-only `YYYY-MM-DD` value and an IANA timezone, SHALL validate the
timezone on the server, and SHALL reject a date later than the server-derived current calendar date in
that timezone without trusting a client-supplied current date.

#### Scenario: Historic date is submitted
- **WHEN** an active member submits a real date before the current date in their valid IANA timezone
- **THEN** the system persists and returns the same date-only value

#### Scenario: Browser-local current date is submitted
- **WHEN** an active member submits the current calendar date derived for their valid IANA timezone
- **THEN** the system accepts the date even if another timezone is already on a different date

#### Scenario: Date is absent or malformed
- **WHEN** the submitted date is empty, malformed, or not a real calendar date
- **THEN** the system rejects the update, associates validation with the date control, preserves the
  attempted value, and leaves the persisted date unchanged

#### Scenario: Timezone is invalid
- **WHEN** the submitted timezone is absent or not a valid IANA timezone
- **THEN** the system rejects the update without changing the persisted date or trusting a submitted
  current date

#### Scenario: Date is in the acting member's future
- **WHEN** the submitted date is later than the current calendar date derived in the submitted valid
  timezone
- **THEN** the system rejects the update, preserves the attempted value, and leaves the persisted date
  unchanged

### Requirement: Optimistic start-date concurrency
The system SHALL require the canonical shared-space revision observed when editing begins, SHALL
update the date only when that revision is still current, and SHALL return a conflict without
overwriting a newer shared-space update when the revision is stale.

#### Scenario: Revision remains current
- **WHEN** an active member saves a valid date with the current canonical revision
- **THEN** the system atomically updates the date and returns the new canonical date and revision

#### Scenario: Shared space changes first
- **WHEN** an active member saves with a revision made stale by another successful shared-space update
- **THEN** the system returns HTTP `409`, preserves the attempted date, and provides the current
  canonical date and revision to the still-authorized member

#### Scenario: Member resolves a conflict
- **WHEN** the member accepts the current canonical date or retries the preserved draft against the
  refreshed revision
- **THEN** the interface either exits editing with the canonical value or submits a new explicit
  update without silently overwriting it

### Requirement: Start-date interaction states
The system SHALL provide explicit edit, cancel, save, pending, success, validation, conflict, and
recoverable failure states while preventing duplicate local submissions.

#### Scenario: Member cancels editing
- **WHEN** the member changes the date draft and activates cancel
- **THEN** the interface exits editing, restores the persisted canonical date, and performs no
  mutation

#### Scenario: Update is pending
- **WHEN** a valid start-date update is in flight
- **THEN** conflicting controls are disabled, duplicate submission is prevented, and pending feedback
  is announced

#### Scenario: Update succeeds
- **WHEN** the server confirms the start-date update
- **THEN** the interface exits editing, announces success, and displays the returned canonical date

#### Scenario: Update fails unexpectedly
- **WHEN** the update fails for a recoverable non-conflict reason
- **THEN** the interface preserves the attempted date, keeps an explicit retry path, and continues to
  identify the previously persisted canonical date

### Requirement: Canonical start-date refresh
The system SHALL reconcile Settings and the inclusive dashboard day counter after a successful
start-date update without requiring navigation, reauthentication, or realtime synchronization.

#### Scenario: Settings update succeeds
- **WHEN** a member successfully updates the start date from Settings
- **THEN** Settings uses the returned date immediately and an authoritative refresh supplies the
  persisted date to the dashboard counter

#### Scenario: Later page load follows an update
- **WHEN** either active member loads Settings or the dashboard after a successful update
- **THEN** the displayed date and inclusive counter use the persisted canonical start date

### Requirement: Accessible and responsive start-date controls
The system SHALL give every start-date control an accessible name, associated validation, keyboard
operation, visible focus, predictable post-action focus, and announced non-color feedback across
supported mobile and desktop viewports.

#### Scenario: Member updates with a keyboard
- **WHEN** a member edits, validates, cancels, resolves a conflict, or saves using only a keyboard
- **THEN** controls remain in logical order and focus moves to or remains on the relevant date control,
  initiating action, conflict recovery, or updated value

#### Scenario: Controls reflow on mobile
- **WHEN** the shared Settings section is displayed on a supported narrow viewport
- **THEN** the date control, validation, and actions remain readable and operable without clipping or
  collision with fixed navigation and safe-area insets
