## Purpose

Allow either active-space member to safely revise an available memory and its private photos while
preserving authorization, concurrent changes, related records, and an all-or-nothing user outcome.

## Requirements

### Requirement: Authorized detail-only edit access

The system SHALL allow either authenticated available member to edit an active memory belonging to
that member's active space through `/memories/[memoryId]/edit`. The interface SHALL expose the Edit
action on the memory's direct Timeline or Vault detail page and MUST NOT expose it on Timeline, Vault,
dashboard, recent-memory, or related-memory cards or other summary surfaces. Direct navigation to the
edit route SHALL remain authorized by the server rather than by the presence of the action. The server
MUST derive the requester, space, current placement, and memory from the authenticated session;
client-supplied ownership or placement MUST NOT establish access. Malformed, missing, inactive,
soft-deleted, other-space, and inaccessible memory identifiers MUST produce the same generic not-found
outcome. The localized action label SHALL be the concise equivalent of `Edit`. On direct detail pages,
the action SHALL share the preserved-by footer: it appears before the attribution on mobile and on the
same row as the attribution when the available width supports both.

#### Scenario: Active member edits from a timeline detail

- **WHEN** either active member activates Edit on an available timeline memory's direct detail page
- **THEN** the system navigates to `/memories/[memoryId]/edit` and displays the authorized editor with
  that memory's current editable state

#### Scenario: Active member edits from a Vault detail

- **WHEN** either active member activates Edit on an available Vault memory's direct detail page
- **THEN** the system navigates to `/memories/[memoryId]/edit` and displays the authorized editor
  without making the memory timeline-eligible

#### Scenario: Summary surfaces do not expose Edit

- **WHEN** a member views a memory through a Timeline, Vault, dashboard, recent-memory, or
  related-memory card or another summary surface
- **THEN** that surface provides no Edit action

#### Scenario: Detail action adapts beside attribution

- **WHEN** a member views an editable memory detail across supported widths
- **THEN** the localized Edit action appears above Preserved by on mobile and beside it on wider
  screens without changing source-order accessibility

#### Scenario: Member addresses an unavailable edit route

- **WHEN** a member directly addresses the edit route for a malformed, missing, inactive,
  soft-deleted, other-space, or inaccessible memory identifier
- **THEN** the system returns the same generic not-found outcome without disclosing record state

### Requirement: Shared create and edit form experience

The system SHALL provide memory creation at `/memories/new` instead of `/timeline/new` and memory
editing at `/memories/[memoryId]/edit`. Both routes SHALL render the same form UI composition,
responsive layout, editable field controls, photo workspace, placement controls, validation placement,
and accessibility behavior. Creation and editing SHALL retain distinct initial state, action copy,
submission contracts, pending and error feedback, and success navigation appropriate to their
operation. The system MUST NOT maintain visually or structurally divergent create and edit forms.

#### Scenario: Member opens memory creation

- **WHEN** an available member navigates to `/memories/new`
- **THEN** the system displays the shared memory form UI initialized for creation

#### Scenario: Member opens memory editing

- **WHEN** an authorized member navigates to `/memories/[memoryId]/edit`
- **THEN** the system displays the same form UI and responsive layout initialized with the memory's
  editable state and edit-specific actions and feedback

#### Scenario: Member addresses the former creation route

- **WHEN** a member addresses `/timeline/new`
- **THEN** the system returns a not-found outcome and does not display the create-memory form

### Requirement: Prefilled editable memory state

The editor SHALL prefill the current title, description, memory date, location, placement, complete
ordered photo set, and selected cover in the shared memory form UI. Every prefilled field and photo
control that is editable during creation SHALL remain editable during editing, including adding new
photos, removing retained or newly selected photos, removing all photos, and changing the cover.
Existing photo previews MUST use opaque same-origin media URLs whose every request reauthorizes the parent
memory before returning bytes; the browser and mutation request MUST NOT expose or accept Storage object
paths, signed Storage credentials, or redirects as authority.
Creator, creation timestamp, comments, and reactions SHALL NOT be editable by US-007.

#### Scenario: Memory has complete editable data

- **WHEN** an authorized member opens a memory with metadata, photos, and a cover
- **THEN** every editable value is prefilled, photos appear in their current order, and the current
  cover is selected

#### Scenario: Memory has no optional values or photos

- **WHEN** an authorized member opens a memory without description, location, photos, or cover
- **THEN** the editor presents valid empty optional fields and an empty photo selection without
  fabricating content

### Requirement: Validated details and placement update

The system SHALL require a title whose trimmed length is 1 through 120 characters, a real date-only
memory date no later than the server-derived current date in the submitted valid IANA timezone, an
optional trimmed description of at most 2,000 characters, an optional trimmed location of at most 150
characters, and placement exactly `timeline` or `vault`. A successful placement change SHALL preserve
the memory identifier and all unrelated data while changing list eligibility according to the final
placement.

#### Scenario: Member saves valid metadata changes

- **WHEN** an active member submits valid changed details and placement
- **THEN** the system persists the normalized values on the same memory without changing its creator,
  comments, or reactions

#### Scenario: Member moves a memory through the editor

- **WHEN** a valid edit changes timeline placement to Vault or Vault placement to timeline
- **THEN** the memory leaves its prior list and appears in its final list at the position determined by
  memory date, creation timestamp, and identifier

#### Scenario: Submitted field is invalid

- **WHEN** title, description, location, memory date, timezone, or placement is missing, malformed,
  invalid, or outside its allowed boundary
- **THEN** the system identifies the affected field and leaves the memory and photos unchanged

### Requirement: Retained and replacement photo editing

The system SHALL allow an edit to retain any current photos, remove any or all current photos, and add
replacement JPEG, PNG, or WebP photos whose verified binary content is no larger than 5 MB each. At
most five retained and replacement photos SHALL remain after the edit. Retained photos MUST preserve
their current persisted relative order regardless of request order; accepted new photos SHALL follow
them in file-selection order. US-007 MUST NOT provide manual photo reordering.

When photos remain, the request MUST select exactly one retained or replacement photo as cover. When
no photos remain, the cover MUST be null. A request MUST NOT retain or select a photo that does not
belong to the authorized memory.

#### Scenario: Member retains and adds photos

- **WHEN** a valid edit retains current photos and adds valid replacement photos within the five-photo
  boundary
- **THEN** retained photos keep their relative order, new photos follow in selection order, and the
  selected retained or new photo becomes cover

#### Scenario: Member removes every photo

- **WHEN** a valid edit retains no current photo and adds no replacement photo
- **THEN** the memory has no photo metadata or cover and affected views use their accessible fallback

#### Scenario: Photo edit is invalid

- **WHEN** a request would leave more than five photos, includes an invalid file, references a foreign
  or unavailable retained photo, or leaves an invalid cover
- **THEN** the system rejects the photo input and leaves every existing photo and cover available

### Requirement: Atomic edit and private-media cleanup

The system SHALL expose one successful edit outcome only after normalized metadata, final placement,
retained and replacement photo metadata, cover selection, and every new private photo variant are
ready to become available together. A staging, upload, validation, or persistence failure MUST leave
the prior memory, prior cover, and prior photo access unchanged and MUST make newly staged objects
inaccessible and eligible for server-side cleanup.

Photos removed by a successful edit MUST become unavailable through product and Storage routes only
after the edit commits. Retained photo objects MUST NOT be rewritten. Cleanup of now-unreferenced old
objects MAY complete asynchronously, but those objects MUST remain inaccessible while retained under
the MVP cleanup policy.

#### Scenario: Complete edit commits

- **WHEN** every metadata, replacement upload, and final persistence step succeeds
- **THEN** the updated memory and final photo set become observable together as one successful edit

#### Scenario: Edit fails after replacement upload begins

- **WHEN** staging, upload, or final persistence fails before the edit commits
- **THEN** the prior memory and photo set remain current, new objects remain inaccessible and are
  cleaned up, and the member receives a retryable failure

#### Scenario: Successful edit removes an old photo

- **WHEN** the edit commits without retaining one of the current photos
- **THEN** that photo is no longer readable through product or Storage routes while retained photos
  remain available

### Requirement: Optimistic concurrency and idempotent submission

The editor SHALL submit the version token read with the prefilled memory and one client-generated UUID
idempotency key for the current normalized edit attempt. The system MUST atomically verify that the
memory is still available in the active space and its version still matches before committing. A
newer edit, move, restore, or delete MUST cause a conflict outcome with no partial write; the interface
SHALL require the member to reload current values rather than silently merge or overwrite them.

Concurrent or repeated requests from the same member with the same idempotency key and normalized
input MUST produce at most one committed edit. A completed retry SHALL return the original edit
outcome; reuse of that key with different normalized input MUST be rejected.

#### Scenario: Two members edit the same version

- **WHEN** one member commits an edit before another member submits changes based on the prior version
- **THEN** the later request returns a conflict, changes nothing, and offers a path to reload the
  current memory

#### Scenario: Edit overlaps another lifecycle mutation

- **WHEN** an edit's expected version is stale because a move, restore, delete, or other edit committed
  first
- **THEN** the edit returns a conflict or generic unavailable outcome as appropriate and does not
  overwrite the completed mutation

#### Scenario: Same edit request is repeated

- **WHEN** repeated requests use the same member, idempotency key, and normalized edit input
- **THEN** the system commits at most one edit and returns the same completed outcome

### Requirement: Editor feedback, navigation, and affected-view refresh

The system SHALL provide edit-shaped loading, accessible field and file validation, single-flight save,
recoverable failure, conflict-reload, and generic unavailable states. Cancelling SHALL make no change
and return to the detail route matching the memory's initial placement. A successful save SHALL
navigate to the detail route matching the final placement and announce that the memory was updated
through the application's localized accessible toast system.

After success, the next Timeline, Vault, dashboard, current detail, and related-memory read SHALL
reflect the edit from its first page or current route. Realtime partner updates are not required.

#### Scenario: Member cancels an edit

- **WHEN** a member cancels editing a timeline or Vault memory
- **THEN** the interface changes nothing and returns to the detail route matching that memory's
  initial placement

#### Scenario: Placement changes on save

- **WHEN** a member saves an edit whose final placement differs from its initial placement
- **THEN** the interface shows a localized success toast, navigates to the memory's final-placement
  detail route without a persistent success query parameter, and refreshes affected list data

#### Scenario: Member activates save repeatedly

- **WHEN** save is activated more than once while the request is pending
- **THEN** the interface starts one edit attempt, disables conflicting controls, and communicates
  pending progress

#### Scenario: Recoverable edit failure occurs

- **WHEN** a valid edit cannot complete for a non-conflict recoverable reason
- **THEN** the interface preserves entered values and selected local files and provides an accessible
  retry path using the same unchanged-attempt idempotency key
