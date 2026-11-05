# Spec Delta

## MODIFIED Requirements

### Requirement: Active-space Vault visibility
The system SHALL allow an authenticated available member to view only new-backend memories in that
member's active space where `visibility = 'vault'` and `deleted_at is null`. It MUST exclude Timeline
memories, unavailable memberships and deleted spaces, and MUST NOT read legacy Supabase data. The
interface MUST clearly state that the Private Vault is shared by both active members and does not
hide memories from either member.

#### Scenario: Available member views Vault memories
- **WHEN** an available member opens the Private Vault for an active space with eligible memories
- **THEN** the system displays only that space's active new-backend memories with Vault visibility

#### Scenario: Timeline and soft-deleted memories exist
- **WHEN** the active space contains Timeline memories or soft-deleted memories
- **THEN** the Private Vault excludes them

#### Scenario: Either active member opens the Vault
- **WHEN** either available member of a two-member active space opens the Private Vault
- **THEN** that member can view the same eligible shared Vault memories and is informed that the Vault is shared

#### Scenario: Legacy Vault memories exist
- **WHEN** Vault memories exist only in Supabase
- **THEN** those memories do not appear in the migrated Vault and no legacy fallback is attempted

### Requirement: Vault memory summaries and extension regions
The system SHALL render each Vault memory with its title, memory date, cover-photo preview or
accessible fallback, and available description and location previews. Each card MUST retain one
accessible link to its existing UUID detail route and independently interactive extension regions.
Migrated list cards MUST omit comment counts and reaction summaries or controls, MUST NOT fabricate
social counts, and MUST NOT invoke legacy social endpoints or invent unshipped controls.

#### Scenario: Vault memory has complete summary data
- **WHEN** an eligible Vault memory has a cover photo, description, and location
- **THEN** its card displays all required and available summary fields and links to its existing detail route

#### Scenario: Optional summary data is absent
- **WHEN** an eligible Vault memory has no resolvable cover, description, or location
- **THEN** its card remains available with an accessible cover fallback and no fabricated optional content

#### Scenario: Later capability supplies a Vault action
- **WHEN** an in-scope capability contributes an action to a Vault card
- **THEN** that content renders in its designated extension region without nesting interactive controls inside the detail link

#### Scenario: Migrated Vault card has no social metadata
- **WHEN** a new-backend Vault item is rendered
- **THEN** the card mounts no reaction control, issues no comment or reaction request, and displays no placeholder social counts

### Requirement: Authorized private cover delivery
Migrated Vault reads SHALL authorize available parent memories and ready cover attachments before
issuing direct storage GET URLs signed for 300 seconds. Cards MUST request those URLs directly,
without the legacy image route or a new application media endpoint. Storage MUST remain private.
An absent or unavailable cover MUST produce the accessible fallback without excluding an eligible
memory. Legacy detail, edit-preview, and related-memory media SHALL retain their existing delivery.

#### Scenario: Authorized Vault cover resolves
- **WHEN** an authorized Vault read includes an eligible memory with a ready attached cover
- **THEN** the card requests its five-minute signed URL directly from storage, without an application image request

#### Scenario: Vault cover is absent or cannot be delivered
- **WHEN** an eligible Vault memory has no ready cover or its authorized media response is unavailable
- **THEN** the card displays the accessible fallback without making the storage object public

#### Scenario: Membership becomes unavailable before the image request
- **WHEN** the caller loses active membership after receiving a signed cover URL
- **THEN** new Vault list requests deny access, while the previously issued URL can remain usable until its effective expiry

#### Scenario: Vault cover URL has expired
- **WHEN** a new storage request uses a cover URL after its effective expiry
- **THEN** the expired URL does not authorize the download; this change does not require automatic renewal or removal of already-downloaded image bytes

### Requirement: Deterministic bounded Vault pagination
The system SHALL return at most 20 eligible Vault memories per page, defaulting to newest-first
and supporting oldest-first. All ordering fields (`memoryDate`, `createdAt`, `id`) MUST use the
selected direction and full precision in lexicographic continuations. Opaque version-1 Base64URL
JSON cursors SHALL contain exactly `memoryDate`, `createdAt`, `id`, `sort`, and `v`. Newest means
memory-date order, not move time. The terminal next cursor MUST be null.

#### Scenario: Equal-date Vault memories span pages
- **WHEN** more than 20 eligible Vault memories share memory dates or creation timestamps
- **THEN** successive pages return every eligible memory once in the selected total order

#### Scenario: Memory moves into the Vault
- **WHEN** a later capability changes an active memory from Timeline to Vault visibility
- **THEN** the memory appears at its memory-date, creation-timestamp, and identifier position rather than by move time

#### Scenario: Final Vault page is reached
- **WHEN** the current page contains the final eligible Vault memory
- **THEN** the system returns no next cursor and offers no further page

#### Scenario: Oldest-first Vault ordering is selected
- **WHEN** the member selects oldest-first
- **THEN** all three ordering fields and continuation comparisons use ascending order

#### Scenario: Vault timestamps differ below millisecond precision
- **WHEN** eligible records have creation timestamps differing only in PostgreSQL microseconds
- **THEN** pagination preserves exact tuple order and anchor equality without duplicates, skips, or spurious resets

### Requirement: Invalid and stale Vault cursor recovery
The system SHALL reject malformed, oversized, unsupported-version, extra-field, or invalid-shape
Vault cursors with HTTP 400 and the standard error envelope. A valid cursor with a changed sort
or an anchor no longer eligible in the current active-space Vault SHALL return the current first
page with `cursorReset: true`. Invalid or stale cursors MUST NOT be continuation predicates or
disclose whether their referenced memory exists or why it is unavailable.

#### Scenario: Malformed Vault cursor is supplied
- **WHEN** a member requests a subsequent Vault page with a malformed or unsupported cursor
- **THEN** the API returns HTTP 400 without applying that cursor as a continuation predicate

#### Scenario: Cursor anchor leaves the Vault
- **WHEN** the cursor anchor is restored to the Timeline, soft-deleted, changed, or becomes inaccessible
- **THEN** the system returns the current first page and signals refresh without disclosing the anchor's state

#### Scenario: Vault cursor sort differs from requested sort
- **WHEN** a well-formed Vault cursor was issued for the opposite sort direction
- **THEN** the system returns the current sort's first page with `cursorReset: true`

#### Scenario: Vault client receives a reset page
- **WHEN** a successful Vault response marks the cursor as reset
- **THEN** the interface discards stale accumulated pages instead of appending duplicate first-page items

## REMOVED Requirements

### Requirement: Vault card reaction summary and controls
**Reason**: Comments and reactions are excluded from the new-backend list migration.
**Migration**: Omit reaction controls and social metadata from migrated Vault cards and payloads;
leave legacy detail-page reaction behavior and persistence untouched for a separate migration.
