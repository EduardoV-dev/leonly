## Purpose

Provide active-space members with a complete, private, and accessible view of an available memory and
its ordered photos while preserving non-enumerating authorization and recoverable read behavior.

## Requirements

### Requirement: Authorized active-space memory detail

The system SHALL allow an authenticated available member to open an undeleted new-backend memory in that
member's active space through its visibility-specific Timeline or Vault detail route. It MUST derive
access from the authenticated session and active membership; client-supplied space, creator, or
visibility values MUST NOT establish authority. Opening a Vault memory directly MUST NOT make it
eligible for the timeline, and detail reads MUST NOT query Supabase.

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

Authorized detail SHALL present attached photos with the selected cover first and remaining photos
in persisted relative order. Ready cover/detail variants SHALL use direct GET URLs signed for 300
seconds, subject to earlier credential expiry; absent variants SHALL be nullable. Fresh reads MUST
omit removed photos and expose no standalone keys or reusable credentials. Issued URLs can remain
usable until effective expiry after removal, revocation, or deletion. After an edit commits, retained
ready photos SHALL remain normally usable while only pending or failed variants use fallbacks.
Explicit removals SHALL disappear at commit without waiting for additions. A newly selected unready
cover MAY show its normal fallback without hiding other ready gallery photos or silently changing
the selected cover. Later processing failure MUST NOT restore removed photos or roll back the edit.

#### Scenario: Selected cover is not the first persisted photo
- **WHEN** the selected cover has a later persisted position
- **THEN** the gallery places it first and keeps every other photo in persisted relative order

#### Scenario: Memory has no photos
- **WHEN** an authorized memory has no attached photos
- **THEN** detail shows its accessible no-photo fallback

#### Scenario: One photo response is unavailable
- **WHEN** an authorized photo's signed URL cannot deliver bytes
- **THEN** that position shows an accessible fallback while the remaining photos stay usable

#### Scenario: Editor removes a photo
- **WHEN** a successful edit detaches a photo
- **THEN** subsequent detail reads immediately omit it and issue no new URL even if added photos are still processing, while a previously issued URL can work until effective expiry

#### Scenario: Retained and newly added photos are mixed
- **WHEN** Save retains ready A/C, removes B, and adds pending D
- **THEN** fresh detail renders A/C normally, omits B, and shows an accessible fallback only for D's unavailable variants

#### Scenario: Selected new cover is not ready
- **WHEN** the committed selected cover has no ready variant but other retained photos are ready
- **THEN** cover consumers use their normal fallback and ready retained gallery photos stay usable without a silent cover change

#### Scenario: Added photo fails after Save
- **WHEN** a newly attached photo permanently fails processing
- **THEN** its unavailable fallback does not hide retained ready photos, undo saved metadata, or restore removed photos

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

Timeline and Vault detail screens SHALL enable reactions, migrated comments, one contextual placement
button, and one Delete action for authorized memories. The Delete action is available only on detail
screens: Move to Vault on Timeline detail and Move to Timeline on Vault detail. The screens MUST NOT render
or mount memory edit controls or issue unsupported edit requests. The screens SHALL preserve gallery
navigation, related-memory links, and contextual back navigation.

#### Scenario: Timeline memory detail is composed

- **WHEN** the detail view renders an authorized Timeline memory
- **THEN** reactions, comments, Move to Vault, and Delete are available while Move to Timeline and edit controls and their requests are absent

#### Scenario: Vault memory detail is composed

- **WHEN** the detail view renders an authorized Vault memory
- **THEN** reactions, comments, Move to Timeline, and Delete are available while Move to Vault and edit controls and their requests are absent

### Requirement: Detail loading and recoverable failure feedback

Detail SHALL show dedicated loading and retryable read-failure states without stale content presented
as current. Retry and refresh SHALL preserve the requested route, reauthorize access, and issue fresh
signed URLs for eligible variants, including newly ready edit additions. Realtime partner updates and
automatic image-readiness polling are not required.

#### Scenario: Initial detail read is pending
- **WHEN** an authorized detail read has not completed
- **THEN** the route shows detail-shaped loading without fabricated content

#### Scenario: Detail read fails
- **WHEN** a read fails for a reason other than an unavailable memory
- **THEN** the route shows no stale detail and provides an accessible retry action

#### Scenario: Authorized detail route is refreshed
- **WHEN** a member directly refreshes or retries detail
- **THEN** current authorization and detail are resolved with newly signed URLs for eligible photos

### Requirement: Detail reaction summary and controls

Timeline and Vault detail screens SHALL display the current-backend reaction summary from the initial authorized detail response and mount the existing reaction control. The control SHALL show counts and the caller's selection, expose current reacting member names, and support adding, replacing, and removing reactions through the current backend. Initial rendering MUST NOT require a separate browser summary request.

#### Scenario: Timeline detail shows reactions
- **WHEN** an active member opens Timeline detail
- **THEN** the reaction control displays the summary from the detail response without a Supabase request or an additional initial browser summary request

#### Scenario: Vault detail shows reactions
- **WHEN** an active member opens Vault detail
- **THEN** the reaction control displays the summary from the detail response without changing memory visibility or querying Supabase

#### Scenario: Member reacts from detail
- **WHEN** an active member selects a reaction on either detail screen
- **THEN** the control sends the toggle to the current backend, gives optimistic feedback, and reconciles selection, counts, and member names with the authoritative summary

#### Scenario: Reaction cannot be confirmed
- **WHEN** a reaction request fails while the memory remains available
- **THEN** the interface restores confirmed state, announces a retryable failure, and attempts to refresh the authoritative summary without automatically repeating the toggle

#### Scenario: Memory becomes unavailable
- **WHEN** a reaction request reports that the memory is no longer available
- **THEN** the screen refreshes its authorization and transitions to the generic memory not-found experience without retaining stale reaction data

### Requirement: Related memories use the current backend
Both detail screens SHALL display bounded related summaries from the authorized new-backend detail
response. Related memories MUST be in the same active space and visibility, exclude the current memory,
and use their correct contextual detail links. The screen SHALL NOT query Supabase for related content
or display fabricated social counts.

#### Scenario: Member opens a related memory
- **WHEN** a member selects a related Timeline or Vault card
- **THEN** the link opens the corresponding visibility-specific detail route

#### Scenario: No related memories exist
- **WHEN** there are no eligible related memories
- **THEN** the screen displays its existing empty state
