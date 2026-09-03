## Purpose

Provide active-space members with a complete, private, and accessible view of an available memory and
its ordered photos while preserving non-enumerating authorization and recoverable read behavior.

## Requirements

### Requirement: Authorized active-space memory detail

The system SHALL allow an authenticated available member to open an available timeline or shared Private
Vault memory belonging to that member's active space through its UUID detail route. It MUST derive access
from the authenticated session and active membership; client-supplied space, creator, or visibility values
MUST NOT establish authority. Opening a Vault memory directly MUST NOT make it eligible for the timeline.

#### Scenario: Active member opens a timeline memory

- **WHEN** an available member opens the UUID detail route for an available timeline memory in the active
  space
- **THEN** the system displays that memory's authorized detail

#### Scenario: Active member opens a Vault memory directly

- **WHEN** an available member opens the UUID detail route for an available shared Private Vault memory in
  the active space
- **THEN** the system displays that memory's authorized detail without adding it to the timeline

### Requirement: Non-enumerating unavailable outcome

The system MUST return the same generic not-found outcome when a memory identifier is malformed, missing,
soft-deleted, inactive, outside the requester's active space, or inaccessible to the requester. That outcome
MUST NOT disclose whether a record exists, its visibility, lifecycle state, owning space, creator, photo
metadata, or storage data.

#### Scenario: Memory is unavailable

- **WHEN** a member opens a malformed, missing, soft-deleted, inactive, other-space, or unauthorized memory
  identifier
- **THEN** the system renders the same generic not-found outcome with no memory or photo data

### Requirement: Complete memory story and current creator attribution

The detail view SHALL show the memory title and date, its full description and location when present, its
current visibility, and the creator's current display name from that memory space's available membership.
Description and location MUST render as absent rather than fabricated when their persisted values are null.
Creator attribution MUST NOT grant or broaden access to the memory.

#### Scenario: Memory contains all detail metadata

- **WHEN** an authorized memory has a description, location, and available creator membership
- **THEN** the detail view shows its complete title, date, description, location, visibility, and the
  creator's current membership display name

#### Scenario: Optional metadata is absent

- **WHEN** an authorized memory has no description or location
- **THEN** the detail view remains valid and does not invent description or location content

### Requirement: Deterministic private photo presentation

The system SHALL present every available photo belonging to the authorized memory. When a selected cover
exists, it MUST appear first; all remaining photos MUST follow by persisted position ascending while keeping
their relative order. Each photo MUST use an opaque same-origin media URL whose every request reauthorizes the
parent memory before returning bytes. The browser MUST NOT receive or accept an object path, signed Storage
credential, redirect, or client-supplied identity as authority. Missing photos and unavailable media responses
MUST use an accessible fallback without exposing Storage metadata or preventing other available photos from
being viewed.

#### Scenario: Selected cover is not the first persisted photo

- **WHEN** an authorized memory's selected cover has a later persisted position
- **THEN** the gallery shows that cover first and every other photo in persisted-position order

#### Scenario: Memory has no photos

- **WHEN** an authorized memory has no available photo metadata
- **THEN** the detail view shows a valid accessible no-photo presentation

#### Scenario: One photo response is unavailable

- **WHEN** one authorized photo cannot deliver bytes through its reauthorizing media URL
- **THEN** that photo position shows an accessible fallback while the remaining available photos stay usable

### Requirement: Accessible photo navigation

For a multi-photo memory, the system SHALL provide keyboard-operable previous, next, and direct photo
selection controls. It MUST expose the current photo's one-based position, total photo count, and selected
state semantically, preserve visible focus, and use meaningful image alternatives. Navigation MUST wrap from
the final photo to the first and from the first photo to the final photo. A single-photo memory MUST NOT
render unnecessary navigation controls.

#### Scenario: Keyboard user advances through photos

- **WHEN** a keyboard user activates next, previous, or a direct photo selector
- **THEN** the displayed photo, semantic position, and selected state update together and focus remains
  predictable

#### Scenario: Navigation reaches a gallery boundary

- **WHEN** a member advances after the final photo or moves back before the first photo
- **THEN** selection wraps to the first or final photo respectively

#### Scenario: Memory has one photo

- **WHEN** an authorized memory contains exactly one available photo
- **THEN** the photo is displayed without previous, next, or direct-selection controls

### Requirement: Detail extension regions respect visibility

The detail composition SHALL provide stable regions for memory actions, comments, and reactions without
fabricating unavailable controls. The action region MUST receive the current memory visibility so later
capabilities can offer move-to-Private-Vault for a timeline memory or restore for a Vault memory, while edit
and delete can remain visibility-independent. Comment and reaction regions MUST remain compatible with both
timeline and Vault detail views.

#### Scenario: Timeline memory detail is composed

- **WHEN** the detail view renders a timeline memory
- **THEN** its extension composition identifies timeline visibility for later action capabilities and keeps
  comment and reaction regions available for later population

#### Scenario: Vault memory detail is composed

- **WHEN** the detail view renders a Vault memory
- **THEN** its extension composition identifies Vault visibility for later action capabilities and keeps
  comment and reaction regions available for later population

### Requirement: Detail loading and recoverable failure feedback

The system SHALL provide a dedicated loading presentation while authorized detail is pending. A read failure
that is not an unavailable outcome MUST render a retryable error, MUST NOT display stale detail as current,
and MUST preserve the requested route for retry. Retrying or directly refreshing an authorized detail URL
SHALL resolve access again and issue current opaque photo media URLs. Realtime partner updates are not
required.

#### Scenario: Initial detail read is pending

- **WHEN** an authorized memory detail read has not completed
- **THEN** the route shows a detail-shaped loading presentation without fabricated memory content

#### Scenario: Detail read fails

- **WHEN** an authorized detail read fails for a reason other than an unavailable memory
- **THEN** the route shows no stale detail and provides an accessible retry action

#### Scenario: Authorized detail route is refreshed

- **WHEN** a member directly refreshes or retries an authorized memory detail URL
- **THEN** the system resolves authorization again and renders current detail with reauthorizing photo media
  URLs

### Requirement: Detail reaction summary and controls

The memory-detail reaction extension region SHALL display the authorized member's current reaction and
authoritative counts for every supported reaction type on an available Timeline or shared Private Vault
memory. It MUST provide accessible reaction controls, refresh the summary after every completed local action,
and preserve the detail page's existing unavailable outcome. Realtime partner updates are not required.

#### Scenario: Timeline detail shows reactions

- **WHEN** an active member opens an available Timeline memory detail
- **THEN** the detail reaction region displays current counts and that member's confirmed selection

#### Scenario: Vault detail shows reactions

- **WHEN** an active member opens an available shared Private Vault memory detail
- **THEN** the detail reaction region displays current counts and that member's confirmed selection

#### Scenario: Member reacts from detail

- **WHEN** a member completes a local reaction action in a memory detail view
- **THEN** the detail reaction region refreshes to the authoritative summary without changing memory visibility
