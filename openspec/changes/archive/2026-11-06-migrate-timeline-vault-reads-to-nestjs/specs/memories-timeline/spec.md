# Spec Delta

## MODIFIED Requirements

### Requirement: Active-space timeline visibility
The system SHALL allow an authenticated available member to view only new-backend memories belonging
to that member's active space where `visibility = 'timeline' and deleted_at is null`. It MUST exclude
Vault memories, unavailable memberships and deleted spaces, and MUST NOT read legacy Supabase data.
A missing cover photo, description, or location MUST NOT exclude an otherwise eligible memory.
Photo previews MUST follow the private-media contract.

#### Scenario: Available member views eligible memories
- **WHEN** an available member opens the timeline for an active space with eligible memories
- **THEN** the system displays only that space's new-backend memories with Timeline visibility and no deletion timestamp

#### Scenario: Memory has optional fields absent
- **WHEN** an eligible memory has no cover photo, description, or location
- **THEN** the system displays the memory with a cover-photo fallback and without fabricated optional content

#### Scenario: Private Vault memory exists
- **WHEN** an otherwise eligible memory is in the shared Private Vault
- **THEN** the timeline excludes it

#### Scenario: Legacy memories exist
- **WHEN** memories exist only in Supabase
- **THEN** those memories do not appear in the migrated Timeline and no legacy fallback is attempted

### Requirement: Timeline card summaries and extension regions
The system SHALL render each timeline memory as a card with its title, memory date, cover-photo
preview or fallback, and any available description and location previews. Each card MUST retain one
accessible link to its existing UUID detail route and stable extension regions that do not interfere
with the link. Migrated list cards MUST omit comment counts and reaction summaries or controls;
they MUST NOT fabricate zero counts or call legacy social endpoints.

#### Scenario: Memory has complete summary data
- **WHEN** an eligible memory has a cover photo, description, and location
- **THEN** its card displays all required and available summary fields without comment or reaction metadata

#### Scenario: Authorized cover response is unavailable
- **WHEN** an eligible memory has a cover photo but its authorized cover response is unavailable
- **THEN** its card renders the existing accessible cover-photo fallback without making storage public

#### Scenario: Member opens a memory from its timeline card
- **WHEN** a member activates an eligible memory card's detail link
- **THEN** the interface navigates to that memory's existing UUID detail route without implying that the detail reader has been migrated

#### Scenario: A capability supplies card content
- **WHEN** an in-scope capability contributes an action to a card
- **THEN** that content is rendered in its designated extension region, remains independently interactive, and does not remove the summary or detail link

#### Scenario: Migrated card has no social metadata
- **WHEN** a new-backend Timeline item is rendered
- **THEN** the card mounts no reaction control, issues no comment or reaction request, and displays no placeholder social counts

### Requirement: Private cover-media delivery
Migrated Timeline reads SHALL authorize available memories and ready cover attachments before
issuing direct storage GET URLs signed for 300 seconds. List cards MUST request those URLs directly,
without an application media endpoint. Storage MUST remain private. Missing or failed covers MUST
use the existing accessible fallback without changing eligibility or ordering. Legacy detail media
SHALL retain its existing same-origin, per-request authorization contract.

#### Scenario: Authorized cover photo is displayed
- **WHEN** an authorized Timeline read returns an available memory with a ready attached cover
- **THEN** the UI requests the five-minute signed URL directly from storage without the legacy image route or a new proxy

#### Scenario: Cover photo is absent or delivery fails
- **WHEN** an authorized read has no ready cover or its authorized media cannot be delivered
- **THEN** the UI renders the existing accessible fallback without making the storage object public

#### Scenario: Unavailable memory includes a cover photo
- **WHEN** a Timeline list read cannot establish that a memory is currently available
- **THEN** it excludes the memory and issues no signed cover URL for it, without revoking previously issued URLs before expiry

#### Scenario: Detail media remains on the legacy route
- **WHEN** an out-of-scope detail page requests an image
- **THEN** the existing same-origin route reauthorizes the parent memory before returning bytes, without exposing object paths or signed storage credentials

#### Scenario: Signed cover URL expires
- **WHEN** a new storage request uses a cover URL after its effective expiry
- **THEN** that URL no longer authorizes the download; an already-downloaded image need not disappear and no automatic renewal behavior is required by this change

### Requirement: Deterministic bounded timeline pagination
The system SHALL return at most 20 eligible memories per page, defaulting to newest-first and
supporting oldest-first. All ordering fields (`memoryDate`, `createdAt`, `id`) MUST use the selected
direction. Continuations MUST use the full lexicographic tuple without losing stored timestamp
precision. Opaque version-1 Base64URL JSON cursors SHALL contain exactly `memoryDate`, `createdAt`,
`id`, `sort`, and `v`. The terminal next cursor MUST be null.

#### Scenario: Equal-date memories span pages
- **WHEN** more than 20 eligible memories share dates or creation timestamps
- **THEN** loading successive pages returns every eligible memory once in the selected total order

#### Scenario: Final page is reached
- **WHEN** the current page contains the final eligible memory
- **THEN** the system returns no next cursor and the timeline does not offer another page

#### Scenario: Oldest-first ordering is selected
- **WHEN** the member selects oldest-first
- **THEN** all three ordering fields and continuation comparisons use ascending order

#### Scenario: Creation timestamps differ below millisecond precision
- **WHEN** eligible records have creation timestamps differing only in PostgreSQL microseconds
- **THEN** pagination preserves their exact tuple order and cursor-anchor equality without duplicates, skips, or spurious resets

### Requirement: Invalid and stale cursor recovery
The system SHALL reject malformed, oversized, unsupported-version, extra-field, or invalid-shape
cursors with HTTP 400 and the standard error envelope. A valid cursor with a changed sort or an
anchor no longer eligible in the current active-space Timeline SHALL return the current first page
with `cursorReset: true`. Invalid or stale cursors MUST NOT be used as continuation predicates or
disclose whether their referenced memory exists.

#### Scenario: Malformed cursor is supplied
- **WHEN** a member requests a subsequent page with a malformed or unsupported cursor
- **THEN** the system returns HTTP 400 without applying that cursor as a continuation predicate

#### Scenario: Cursor anchor becomes unavailable
- **WHEN** the cursor's anchor memory is deleted, hidden, moved to the Vault, or becomes inaccessible
- **THEN** the system returns the first page and signals that the timeline was refreshed without exposing why

#### Scenario: Cursor sort differs from the requested sort
- **WHEN** a well-formed cursor was issued for the opposite sort direction
- **THEN** the system returns the current sort's first page with `cursorReset: true`

#### Scenario: Client receives a reset page
- **WHEN** a successful list response marks the cursor as reset
- **THEN** the interface discards the stale accumulated pages instead of appending duplicate first-page items

## REMOVED Requirements

### Requirement: Timeline card reaction summary and controls
**Reason**: Comments and reactions are excluded from the new-backend list migration.
**Migration**: Omit reaction controls and social metadata from migrated list cards and payloads;
leave legacy detail-page reaction behavior and persistence untouched for a separate migration.
