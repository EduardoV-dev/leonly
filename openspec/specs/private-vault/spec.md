## Purpose

Provide both active-space members with a reliable, shared archive of hidden memories while preserving
active-space authorization, deterministic chronology, and non-enumerating unavailable outcomes.

## Requirements

### Requirement: Active-space Vault visibility

The system SHALL allow an authenticated available member to view only new-backend memories in that
member's active space where `visibility = 'vault'` and `deleted_at is null`. It MUST exclude Timeline
memories, unavailable memberships, and deleted spaces, and MUST NOT read legacy Supabase data. The
interface MUST clearly state that the Private Vault is shared by both active members and does not hide
memories from either member.

#### Scenario: Available member views Vault memories

- **WHEN** an available member opens the Private Vault for an active space with eligible memories
- **THEN** the system displays only that space's active memories with Vault visibility

#### Scenario: Timeline and soft-deleted memories exist

- **WHEN** the active space contains timeline memories or soft-deleted memories
- **THEN** the Private Vault excludes them

#### Scenario: Legacy Vault memories exist
- **WHEN** Vault memories exist only in Supabase
- **THEN** those memories do not appear in the migrated Vault and no legacy fallback is attempted

#### Scenario: Either active member opens the Vault

- **WHEN** either available member of a two-member active space opens the Private Vault
- **THEN** that member can view the same eligible shared Vault memories and is informed that the Vault
  is shared

### Requirement: Vault memory summaries and extension regions

The system SHALL render each Vault memory with its title, memory date, cover-photo preview or
accessible fallback, and available description and location previews. Each card MUST retain one
accessible link to its existing UUID detail route and independently interactive extension regions.
Migrated list cards MUST omit comment counts and reaction data or controls, MUST NOT fabricate social
counts, and MUST NOT invoke legacy social endpoints or invent unshipped controls.

#### Scenario: Vault memory has complete summary data

- **WHEN** an eligible Vault memory has a cover photo, description, and location
- **THEN** its card displays all required and available summary fields and links to its detail route

#### Scenario: Optional summary data is absent

- **WHEN** an eligible Vault memory has no resolvable cover, description, or location
- **THEN** its card remains available with an accessible cover fallback and no fabricated optional
  content

#### Scenario: Later capability supplies a Vault action

- **WHEN** a later capability contributes a count or action to a Vault card
- **THEN** that content renders in its designated extension region without nesting interactive
  controls inside the detail link

### Requirement: Authorized private cover delivery

Migrated Vault reads SHALL authorize available parent memories and ready cover attachments before
issuing direct storage GET URLs signed for 300 seconds, subject to earlier credential expiry. Cards
MUST request those URLs directly without the legacy image route or a new application media endpoint.
Storage MUST remain private. Missing or unavailable covers MUST produce the accessible fallback without
excluding an eligible memory. Legacy edit-preview media retains its existing delivery until migrated.

#### Scenario: Authorized Vault cover resolves

- **WHEN** an authorized Vault read includes an eligible memory with a ready attached cover
- **THEN** the card requests its five-minute signed URL directly from storage without an application
  image request

#### Scenario: Vault cover is absent or cannot be delivered

- **WHEN** an eligible Vault memory has no ready cover or its authorized media response is unavailable
- **THEN** the card displays the accessible fallback without making the storage object public

#### Scenario: Membership becomes unavailable before the image request
- **WHEN** the caller loses active membership after receiving a signed cover URL
- **THEN** new Vault list requests deny access, while the previously issued URL can remain usable until
  its effective expiry

#### Scenario: Vault cover URL has expired
- **WHEN** a new storage request uses a cover URL after its effective expiry
- **THEN** the expired URL does not authorize the download; automatic renewal or removal of already-
  downloaded image bytes is not required

### Requirement: Deterministic bounded Vault pagination

The system SHALL define "newest" by memory date and return at most 20 eligible Vault memories per
page, defaulting to newest-first and supporting oldest-first. The default page size SHALL be 10; the
requested integer limit MUST be between 1 and 20. All ordering fields (`memoryDate`, `createdAt`, `id`)
MUST use the selected direction. Continuations MUST use the full lexicographic tuple without losing
stored timestamp precision. Opaque version-1 Base64URL JSON cursors SHALL contain exactly
`memoryDate`, `createdAt`, `id`, `sort`, and `v`. The terminal next cursor MUST be null.

#### Scenario: Equal-date Vault memories span pages

- **WHEN** more than 20 eligible Vault memories share one or more memory dates or creation timestamps
- **THEN** successive pages return every eligible memory once in the specified total order

#### Scenario: Oldest-first Vault ordering is selected
- **WHEN** the member selects oldest-first
- **THEN** all three ordering fields and continuation comparisons use ascending order

#### Scenario: Vault timestamps differ below millisecond precision
- **WHEN** eligible records have creation timestamps differing only in PostgreSQL microseconds
- **THEN** pagination preserves exact tuple order and anchor equality without duplicates, skips, or
  spurious resets

#### Scenario: Memory moves into the Vault

- **WHEN** a later capability changes an active memory from timeline to Vault visibility
- **THEN** the memory appears at the position determined by its memory date, creation timestamp, and
  identifier rather than the time of the move

#### Scenario: Final Vault page is reached

- **WHEN** the current page contains the final eligible Vault memory
- **THEN** the system returns no next cursor and offers no further page

### Requirement: Invalid and stale Vault cursor recovery

The system SHALL reject malformed, oversized, unsupported-version, extra-field, or invalid-shape
Vault cursors with HTTP 400 and the standard error envelope. A valid cursor with a changed sort or an
anchor no longer eligible in the current active-space Vault SHALL return the current first page with
`cursorReset: true`. Invalid or stale cursors MUST NOT be applied as a query predicate or disclose
whether the referenced memory exists or why it is unavailable.

#### Scenario: Malformed Vault cursor is supplied

- **WHEN** a member requests a subsequent Vault page with a malformed or unsupported cursor
- **THEN** the API returns HTTP 400 without applying that cursor as a continuation predicate

#### Scenario: Cursor anchor leaves the Vault

- **WHEN** the cursor anchor is restored to the timeline, soft-deleted, changed, or becomes inaccessible
- **THEN** the system returns the current first page and signals that the Vault was refreshed without
  disclosing the anchor's state

#### Scenario: Vault cursor sort differs from requested sort
- **WHEN** a well-formed Vault cursor was issued for the opposite sort direction
- **THEN** the system returns the current sort's first page with `cursorReset: true`

### Requirement: Vault feedback and refresh behavior

The system SHALL show a Vault-shaped initial loading presentation while the first page is pending, a
clear slow-network status after the product slow-request threshold, and a shared-Vault empty state when
no eligible memory exists. An initial read failure MUST show a retryable page error. A failed load-more
request MUST retain loaded cards and offer a retry for only the failed next page. Navigation return,
manual refresh, and a completed local action affecting Vault eligibility MUST refresh from page one;
realtime partner updates are not required.

#### Scenario: Vault is empty

- **WHEN** the active space contains no eligible Vault memories
- **THEN** the page explains that the shared Vault is empty and offers a valid path to create a memory

#### Scenario: Initial Vault read fails

- **WHEN** the first Vault page cannot be read
- **THEN** the page displays no fabricated memories and provides an accessible retry action

#### Scenario: Load-more Vault read fails

- **WHEN** a later Vault page cannot be read
- **THEN** already loaded cards remain visible and the member can retry the failed page

#### Scenario: Vault is refreshed

- **WHEN** the member manually refreshes, returns through navigation, or completes a relevant local
  action
- **THEN** the system reloads the Vault from its first page

### Requirement: Responsive and accessible Vault navigation

The system SHALL expose the Private Vault as an enabled destination in the existing desktop and mobile
dashboard navigation. The page and all interactive content MUST remain keyboard operable, visibly
focused, semantically named, understandable without color alone, responsive at supported breakpoints,
and compatible with reduced motion.

#### Scenario: Member navigates to the Vault

- **WHEN** a member activates the Vault destination in desktop or mobile navigation
- **THEN** the Private Vault opens and that destination is exposed as the current page

#### Scenario: Member uses a narrow viewport or reduced motion

- **WHEN** the Vault is viewed on a supported narrow viewport or with reduced motion enabled
- **THEN** all content and recovery actions remain available without horizontal overflow or required
  decorative animation

### Requirement: Non-enumerating Vault boundaries

The system SHALL derive Vault access from the authenticated session and available active-space
membership. Missing, inactive, soft-deleted, malformed, other-space, and inaccessible memory
identifiers MUST produce the same generic not-found outcome and MUST NOT reveal record, lifecycle,
visibility, membership, photo, or storage details.

#### Scenario: Unavailable Vault memory is addressed

- **WHEN** a member addresses a malformed, missing, soft-deleted, inactive, other-space, or unauthorized
  memory identifier
- **THEN** the system returns the same generic not-found outcome with no memory or media disclosure
