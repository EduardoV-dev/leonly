## Purpose

Provide available members with a reliable, private timeline of their shared memories while preserving
memory visibility, lifecycle, and not-found boundaries.

## Requirements

### Requirement: Active-space timeline visibility
The system SHALL allow an authenticated available member to view only memories belonging to that
member's active space where `visibility = 'timeline' and deleted_at is null`. It MUST exclude
 memories in the shared Private Vault from the timeline. A missing cover photo, description, or
location MUST NOT exclude an otherwise eligible memory. A photo preview is available only when its
parent memory is available and its cover URL resolves under the private-media contract.

#### Scenario: Available member views eligible memories
- **WHEN** an available member opens the timeline for an active space with eligible memories
- **THEN** the system displays only that space's memories with `visibility = 'timeline' and
  deleted_at is null`

#### Scenario: Memory has optional fields absent
- **WHEN** an eligible memory has no cover photo, description, or location
- **THEN** the system displays the memory with a cover-photo fallback and without fabricated optional
  content

#### Scenario: Private Vault memory exists
- **WHEN** an otherwise eligible memory is in the shared Private Vault
- **THEN** the timeline excludes it

### Requirement: Timeline card summaries and extension regions
The system SHALL render each timeline memory as a card with its title, memory date, cover-photo
preview or fallback, and any available description and location previews. Each card MUST contain one
accessible link to that memory's UUID detail route while keeping stable extension regions for later
memory-count and action capabilities. The detail link MUST NOT interfere with current or later
interactive controls in those regions.

#### Scenario: Memory has complete summary data
- **WHEN** an eligible memory has a cover photo, description, and location
- **THEN** its card displays all required and available summary fields

#### Scenario: Cover URL cannot be resolved
- **WHEN** an eligible memory has a cover photo but its signed cover URL is unavailable
- **THEN** its card renders the existing accessible cover-photo fallback without exposing the photo's
  `object_path`

#### Scenario: Member opens a memory from its timeline card
- **WHEN** a member activates an eligible memory card's detail link
- **THEN** the interface navigates to that memory's UUID detail route

#### Scenario: Later capability supplies card content
- **WHEN** a later capability contributes a count or action to a card
- **THEN** that content is rendered in its designated extension region, remains independently
  interactive, and does not remove the timeline summary or detail link

### Requirement: Private cover-media delivery
The system SHALL resolve a cover photo's short-lived signed URL only on the server after an authorized
timeline or memory-detail read has established that the parent memory is available to the requesting
member. The timeline and detail UI MUST use only the server-provided resolved URL for a cover preview
and MUST NOT derive, construct, expose, or otherwise use a Storage URL from `object_path`. If a memory
has no cover photo or signed URL resolution fails, the UI MUST render its existing accessible
cover-photo fallback without exposing `object_path`. This delivery contract MUST NOT change the
20-item UUID cursor, ordering, deleted-at eligibility, active-space authorization, Private Vault
timeline exclusion, or generic not-found behavior.

#### Scenario: Authorized cover photo is displayed
- **WHEN** an authorized timeline or detail read returns an available memory with a resolvable cover
  photo
- **THEN** the server returns a short-lived signed cover URL and the UI displays that URL as the cover
  preview

#### Scenario: Cover photo is absent or signing fails
- **WHEN** an authorized timeline or detail read has no cover photo or cannot resolve a signed cover
  URL
- **THEN** the response does not expose `object_path` and the UI renders the existing accessible
  cover-photo fallback

#### Scenario: Unavailable memory includes a cover photo
- **WHEN** a timeline or detail read cannot establish that a memory is available to the requesting
  member
- **THEN** the server does not resolve or return a signed cover URL and preserves the existing timeline
  exclusion or generic not-found outcome

### Requirement: Deterministic bounded timeline pagination
The system SHALL return timeline pages containing at most 20 eligible memories, ordered by memory
date descending, creation timestamp descending, and immutable UUID memory identifier descending. For a
subsequent page, the system MUST return only memories lexicographically after the prior page's last
full ordering tuple so equal memory dates cannot cause duplicates or skips.

The next-page cursor SHALL be an opaque Base64URL-encoded JSON value with version `1` and exactly
the last item tuple: `memoryDate` as a `YYYY-MM-DD` string, `createdAt` as an ISO-8601 UTC instant,
and `id` as the immutable UUID string identifier. The system MUST return no next cursor when no
further eligible memory exists.

#### Scenario: Equal-date memories span pages
- **WHEN** more than 20 eligible memories share one or more memory dates
- **THEN** loading successive pages returns every eligible memory once in the specified total order

#### Scenario: Final page is reached
- **WHEN** the current page contains the final eligible memory
- **THEN** the system returns no next cursor and the timeline does not offer another page

### Requirement: Invalid and stale cursor recovery
The system SHALL treat a cursor as invalid when it is malformed, cannot be decoded, has an
unsupported version, lacks any required field, or has fields that do not match the required shapes.
It SHALL treat a cursor as stale when its tuple no longer identifies an eligible memory in the
requesting member's active-space timeline. For either condition, the system MUST return the first
page for the current active space and a `cursorReset` refresh signal; it MUST NOT use the supplied
cursor as a database predicate or disclose whether its referenced memory existed.

#### Scenario: Malformed cursor is supplied
- **WHEN** a member requests a subsequent page with a malformed or unsupported cursor
- **THEN** the system returns the first page and signals that the timeline was refreshed

#### Scenario: Cursor anchor becomes unavailable
- **WHEN** the cursor's anchor memory is deleted, hidden, moved to the Vault, or becomes inaccessible
- **THEN** the system returns the first page and signals that the timeline was refreshed

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

### Requirement: Timeline card reaction summary and controls

The Timeline card reaction extension region SHALL display the authorized member's current reaction and
authoritative counts for every supported reaction type on each eligible card. Controls MUST be independently
interactive from the card's detail link, remain available for Timeline memories only, and refresh their
summary after a completed local reaction action. Realtime partner updates are not required.

#### Scenario: Timeline card shows reactions

- **WHEN** an eligible Timeline card has reaction data
- **THEN** the card shows its current counts and the requesting member's confirmed selection without nesting
  a control in the detail link

#### Scenario: Member reacts from a Timeline card

- **WHEN** a member completes a local reaction action on a Timeline card
- **THEN** that card refreshes to the authoritative summary and the Timeline remains otherwise usable
