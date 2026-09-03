## Purpose

Provide both active-space members with a reliable, shared archive of hidden memories while preserving
active-space authorization, deterministic chronology, and non-enumerating unavailable outcomes.

## Requirements

### Requirement: Active-space Vault visibility

The system SHALL allow an authenticated available member to view only memories belonging to that
member's active space where `visibility = 'vault'` and `deleted_at is null`. It MUST exclude timeline
memories and soft-deleted memories. The interface MUST clearly state that the Private Vault is shared
by both active members and does not hide memories from either member.

#### Scenario: Available member views Vault memories

- **WHEN** an available member opens the Private Vault for an active space with eligible memories
- **THEN** the system displays only that space's active memories with Vault visibility

#### Scenario: Timeline and soft-deleted memories exist

- **WHEN** the active space contains timeline memories or soft-deleted memories
- **THEN** the Private Vault excludes them

#### Scenario: Either active member opens the Vault

- **WHEN** either available member of a two-member active space opens the Private Vault
- **THEN** that member can view the same eligible shared Vault memories and is informed that the Vault
  is shared

### Requirement: Vault memory summaries and extension regions

The system SHALL render each Vault memory as a summary card with its title, memory date, cover-photo
preview or accessible fallback, and any available description and location previews. Each card MUST
provide one accessible link to the memory's UUID detail route and stable, independently interactive
extension regions for later count, edit, restore, and delete capabilities. US-006 MUST NOT fabricate
controls for capabilities that have not shipped.

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

The system SHALL resolve an opaque same-origin cover media URL only after establishing that the parent Vault
memory is available to the requesting active-space member. Every media request MUST reauthorize the parent
memory before returning bytes. The browser MUST NOT receive or derive a Storage object path, signed Storage
credential, or redirect to a Storage URL. An absent or unavailable authorized media response MUST produce the
accessible card fallback and MUST NOT exclude an otherwise available memory.

#### Scenario: Authorized Vault cover resolves

- **WHEN** an authorized Vault read includes an eligible memory with a resolvable cover photo
- **THEN** the card requests its opaque media URL and receives bytes only after current authorization succeeds

#### Scenario: Vault cover is absent or cannot be delivered

- **WHEN** an eligible Vault memory has no cover photo or its authorized media response is unavailable
- **THEN** the response exposes no Storage authority and the card displays the accessible fallback

### Requirement: Deterministic bounded Vault pagination

The system SHALL define "newest" by memory date and return at most 20 eligible Vault memories per
page, ordered by memory date descending, creation timestamp descending, and immutable UUID identifier
descending. A subsequent page MUST contain only memories lexicographically after the prior page's last
full ordering tuple, so equal memory dates or creation timestamps cannot cause duplicates or skips.

The next-page cursor SHALL be an opaque Base64URL-encoded JSON value with version `1` and exactly the
last item tuple: `memoryDate` as `YYYY-MM-DD`, `createdAt` as an ISO-8601 timestamp with offset, and
`id` as an immutable UUID string. The system MUST return no next cursor when no further eligible Vault
memory exists.

#### Scenario: Equal-date Vault memories span pages

- **WHEN** more than 20 eligible Vault memories share one or more memory dates or creation timestamps
- **THEN** successive pages return every eligible memory once in the specified total order

#### Scenario: Memory moves into the Vault

- **WHEN** a later capability changes an active memory from timeline to Vault visibility
- **THEN** the memory appears at the position determined by its memory date, creation timestamp, and
  identifier rather than the time of the move

#### Scenario: Final Vault page is reached

- **WHEN** the current page contains the final eligible Vault memory
- **THEN** the system returns no next cursor and offers no further page

### Requirement: Invalid and stale Vault cursor recovery

The system SHALL treat a cursor as invalid when it is malformed, cannot be decoded, has an unsupported
version, contains extra or missing fields, or contains fields outside the required shapes. It SHALL
treat a cursor as stale when its full tuple no longer identifies an eligible memory in the requesting
member's active-space Vault. For either condition, the system MUST return the current first page with a
`cursorReset` refresh signal, MUST NOT apply the supplied cursor as a query predicate, and MUST NOT
disclose whether the referenced record exists or why it is unavailable.

#### Scenario: Malformed Vault cursor is supplied

- **WHEN** a member requests a subsequent Vault page with a malformed or unsupported cursor
- **THEN** the system returns the current first page and signals that the Vault was refreshed

#### Scenario: Cursor anchor leaves the Vault

- **WHEN** the cursor anchor is restored to the timeline, soft-deleted, changed, or becomes inaccessible
- **THEN** the system returns the current first page and signals that the Vault was refreshed without
  disclosing the anchor's state

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

### Requirement: Vault card reaction summary and controls

The Vault card reaction extension region SHALL display the authorized member's current reaction and
authoritative counts for every supported reaction type on each eligible card. Controls MUST be independently
interactive from the card's detail link, remain available for shared Private Vault memories only, and refresh
their summary after a completed local reaction action. Realtime partner updates are not required.

#### Scenario: Vault card shows reactions

- **WHEN** an eligible Vault card has reaction data
- **THEN** the card shows its current counts and the requesting member's confirmed selection without nesting
  a control in the detail link

#### Scenario: Member reacts from a Vault card

- **WHEN** a member completes a local reaction action on a Vault card
- **THEN** that card refreshes to the authoritative summary and the Vault remains otherwise usable
