## Purpose

Provide available members with a reliable, private timeline of their shared memories while preserving
memory visibility, lifecycle, and not-found boundaries.

## Requirements

### Requirement: Active-space timeline visibility
The system SHALL allow an authenticated available member to view only new-backend memories belonging
to that member's active space where `visibility = 'timeline' and deleted_at is null`. It MUST exclude
Vault memories, unavailable memberships, and deleted spaces, and MUST NOT read legacy Supabase data.
A missing cover photo, description, or location MUST NOT exclude an otherwise eligible memory. Photo
previews MUST follow the private-media contract.

#### Scenario: Available member views eligible memories
- **WHEN** an available member opens the timeline for an active space with eligible memories
- **THEN** the system displays only that space's new-backend memories with `visibility = 'timeline'
  and deleted_at is null`

#### Scenario: Legacy memories exist
- **WHEN** memories exist only in Supabase
- **THEN** those memories do not appear in the Timeline and no legacy fallback is attempted

#### Scenario: Memory has optional fields absent
- **WHEN** an eligible memory has no cover photo, description, or location
- **THEN** the system displays the memory with a cover-photo fallback and without fabricated optional
  content

#### Scenario: Private Vault memory exists
- **WHEN** an otherwise eligible memory is in the shared Private Vault
- **THEN** the timeline excludes it

### Requirement: Timeline card summaries and extension regions
The system SHALL render each timeline memory as a card with its title, memory date, cover-photo
preview or fallback, and any available description and location previews. Each card MUST retain one
accessible link to its UUID detail route and stable extension regions that do not interfere with the
link. Migrated list cards MUST omit comment counts and reaction data or controls, MUST NOT fabricate
zero counts, and MUST NOT call legacy social endpoints.

#### Scenario: Memory has complete summary data
- **WHEN** an eligible memory has a cover photo, description, and location
- **THEN** its card displays all required and available summary fields without comment or reaction
  metadata

#### Scenario: Authorized cover response is unavailable
- **WHEN** an eligible memory has a cover photo but its authorized cover response is unavailable
- **THEN** its card renders the existing accessible cover-photo fallback without exposing Storage authority

#### Scenario: Member opens a memory from its timeline card
- **WHEN** a member activates an eligible memory card's detail link
- **THEN** the interface navigates to that memory's UUID detail route

#### Scenario: Migrated card has no social metadata
- **WHEN** a new-backend Timeline item is rendered
- **THEN** the card mounts no reaction control, issues no comment or reaction request, and displays no
  placeholder social counts

#### Scenario: A capability supplies card content
- **WHEN** a capability contributes a count or action to a card
- **THEN** that content is rendered in its designated extension region, remains independently
  interactive, and does not remove the timeline summary or detail link

### Requirement: Private cover-media delivery
Migrated Timeline and detail reads SHALL authorize the parent memory and ready cover attachment before
issuing a direct storage GET URL signed for 300 seconds, subject to earlier credential expiry. Timeline
cards and migrated detail views MUST request those URLs directly from private storage, without an
application media endpoint. Missing or unavailable covers MUST use the accessible fallback without
changing eligibility or ordering. Previously issued URLs may remain usable until effective expiry after
access is revoked or the memory is deleted. Legacy editor media routes retain per-request authorization.

#### Scenario: Authorized cover photo is displayed
- **WHEN** an authorized Timeline or detail read finds a ready attached cover
- **THEN** the UI requests its five-minute signed URL directly from storage without the legacy image route
  or a new proxy

#### Scenario: Cover photo is absent or delivery fails
- **WHEN** an authorized read has no ready cover or its signed URL cannot deliver the cover
- **THEN** the UI renders the existing accessible fallback without making storage public

#### Scenario: Unavailable memory includes a cover photo
- **WHEN** a Timeline or detail read cannot establish that a memory is currently available
- **THEN** it issues no fresh cover URL while a previously issued URL may remain usable until expiry

#### Scenario: Signed cover URL expires
- **WHEN** a new storage request uses a cover URL after its effective expiry
- **THEN** that URL no longer authorizes the download; already-downloaded bytes need not disappear and
  automatic renewal is not required

### Requirement: Deterministic bounded timeline pagination
The system SHALL return at most 20 eligible memories per page, defaulting to newest-first and
supporting oldest-first. The default page size SHALL be 10; the requested integer limit MUST be between
1 and 20. All ordering fields (`memoryDate`, `createdAt`, `id`) MUST use the selected direction.
Continuations MUST use the full lexicographic tuple without losing stored timestamp precision.

The next-page cursor SHALL be an opaque version-1 Base64URL-encoded JSON value containing exactly
`memoryDate`, `createdAt`, `id`, `sort`, and `v`. `memoryDate` SHALL be `YYYY-MM-DD`, `createdAt`
SHALL preserve its full UTC timestamp precision, and `id` SHALL be the immutable UUID. The terminal
next cursor MUST be null.

#### Scenario: Equal-date memories span pages
- **WHEN** more than 20 eligible memories share one or more memory dates
- **THEN** loading successive pages returns every eligible memory once in the specified total order

#### Scenario: Oldest-first ordering is selected
- **WHEN** the member selects oldest-first
- **THEN** all three ordering fields and continuation comparisons use ascending order

#### Scenario: Creation timestamps differ below millisecond precision
- **WHEN** eligible records have creation timestamps differing only in PostgreSQL microseconds
- **THEN** pagination preserves their exact tuple order and cursor-anchor equality without duplicates,
  skips, or spurious resets

#### Scenario: Final page is reached
- **WHEN** the current page contains the final eligible memory
- **THEN** the system returns no next cursor and the timeline does not offer another page

### Requirement: Invalid and stale cursor recovery
The system SHALL reject malformed, oversized, unsupported-version, extra-field, or invalid-shape
cursors with HTTP 400 and the standard error envelope. A valid cursor with a changed sort or an anchor
no longer eligible in the current active-space Timeline SHALL return the current first page with
`cursorReset: true`. Invalid or stale cursors MUST NOT be used as continuation predicates or disclose
whether their referenced memory exists.

#### Scenario: Malformed cursor is supplied
- **WHEN** a member requests a subsequent page with a malformed or unsupported cursor
- **THEN** the system returns HTTP 400 without applying the cursor as a continuation predicate

#### Scenario: Cursor anchor becomes unavailable
- **WHEN** the cursor's anchor memory is deleted, hidden, moved to the Vault, or becomes inaccessible
- **THEN** the system returns the first page and signals that the timeline was refreshed

#### Scenario: Cursor sort differs from the requested sort
- **WHEN** a well-formed cursor was issued for the opposite sort direction
- **THEN** the system returns the current sort's first page with `cursorReset: true`

### Requirement: Timeline feedback and refresh behavior
The system SHALL show an initial loading state while the first timeline page is pending, a clear
slow-network status when that pending request exceeds the product slow-request threshold, and an
empty state when no eligible memory exists. It SHALL show a retryable page error when the initial
read fails. When a load-more read fails, it MUST retain already loaded cards and offer a retry for
only the failed next-page request. A navigation return, manual refresh, or completed local action
that can affect eligibility SHALL refresh the timeline from its first page; realtime partner updates
are not required.

#### Scenario: Initial read fails
- **WHEN** the first timeline page cannot be read
- **THEN** the system displays a retryable page-level error and no fabricated memories

#### Scenario: Load-more read fails
- **WHEN** a later timeline page cannot be read
- **THEN** already loaded cards remain visible and the member can retry the failed page

#### Scenario: Timeline is refreshed
- **WHEN** the member manually refreshes, returns through navigation, or completes a relevant local
  action
- **THEN** the system reloads the timeline from the first page

### Requirement: Unavailable memory privacy
The system SHALL use `get_available_memory(uuid)` as the generic null lookup behind memory-detail
resolution and render the same generic not-found outcome when a UUID identifier is missing,
soft-deleted, inaccessible, or outside the member's active space. The RPC's active-space RLS
contract is authoritative; no client-supplied space or user identifier can establish access. An
available member MAY access a shared Private Vault memory through the Vault or an authorized direct
memory URL, but that access MUST NOT make the memory appear in the timeline.

#### Scenario: Unavailable memory route is addressed
- **WHEN** a member addresses a missing, soft-deleted, inaccessible, or other-space UUID identifier
- **THEN** the system renders the generic not-found outcome without disclosing record existence or
  lifecycle state

#### Scenario: Authorized Vault detail route is addressed
- **WHEN** an available member addresses an authorized shared Private Vault memory URL
- **THEN** the member can access that memory without it appearing in the timeline
