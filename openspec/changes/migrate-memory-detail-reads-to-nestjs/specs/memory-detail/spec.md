## MODIFIED Requirements

### Requirement: Deterministic private photo presentation
The system SHALL present every attached photo belonging to the authorized memory. The selected cover MUST appear first, followed by remaining photos in persisted-position order. Each ready cover or detail variant SHALL use a direct storage URL signed for 300 seconds, subject to earlier credential expiry; absent or non-ready variants SHALL be nullable. Storage keys and reusable credentials MUST NOT be exposed. A URL can remain usable until effective expiry after membership revocation or deletion. Missing photos or unavailable variants MUST use an accessible fallback without preventing other photos from being viewed.

#### Scenario: Selected cover is not the first persisted photo
- **WHEN** an authorized memory's selected cover has a later persisted position
- **THEN** the gallery shows that cover first and every other photo in persisted-position order

#### Scenario: Memory has no photos
- **WHEN** an authorized memory has no attached photos
- **THEN** the detail view shows a valid accessible no-photo presentation

#### Scenario: One photo response is unavailable
- **WHEN** a photo's detail variant cannot load but its cover can
- **THEN** the gallery uses the cover; if neither is available it shows an accessible fallback and other photos remain usable

### Requirement: Detail extension regions respect visibility
Timeline and Vault detail screens SHALL be read-only. They MUST NOT render or mount edit, delete, move, restore, reaction, or comment controls or empty action placeholders, and MUST NOT issue associated requests. The screens SHALL preserve gallery navigation, related-memory links, and contextual back navigation.

#### Scenario: Timeline memory detail is composed
- **WHEN** an authorized member opens Timeline detail
- **THEN** unsupported controls and comment sections are absent and no corresponding requests are issued

#### Scenario: Vault memory detail is composed
- **WHEN** an authorized member opens Vault detail
- **THEN** unsupported controls and comment sections are absent and no corresponding requests are issued

### Requirement: Detail loading and recoverable failure feedback
The system SHALL provide a dedicated loading presentation while authorized detail is pending. A read failure other than an unavailable outcome MUST render a retryable error, MUST NOT display stale detail as current, and MUST preserve the requested route for retry. Retrying or directly refreshing SHALL resolve authorization again and issue fresh signed URLs for ready variants. Realtime partner updates are not required.

#### Scenario: Initial detail read is pending
- **WHEN** an authorized detail read has not completed
- **THEN** the route shows a detail-shaped loading presentation without fabricated memory content

#### Scenario: Detail read fails
- **WHEN** an authorized detail read fails for a reason other than an unavailable memory
- **THEN** the route shows no stale detail and provides an accessible retry action

#### Scenario: Authorized detail route is refreshed
- **WHEN** a member directly refreshes or retries an authorized detail URL
- **THEN** the system resolves authorization again and issues fresh signed URLs for ready variants

### Requirement: Detail reaction summary and controls
Timeline and Vault detail screens SHALL NOT display or fetch reaction summaries or controls while the screens are read-only.

#### Scenario: Timeline detail shows reactions
- **WHEN** an active member opens Timeline detail
- **THEN** no reaction UI is rendered and no reaction request is sent

#### Scenario: Vault detail shows reactions
- **WHEN** an active member opens Vault detail
- **THEN** no reaction UI is rendered and no reaction request is sent

#### Scenario: Member reacts from detail
- **WHEN** an active member opens either read-only detail screen
- **THEN** no reaction UI is rendered and no reaction request is sent

## ADDED Requirements

### Requirement: Related memories use the current backend
Both detail screens SHALL display bounded related summaries from the authorized new-backend detail response. Related memories MUST be in the same active space and visibility, exclude the current memory, and use their correct contextual detail links. The screen SHALL NOT query Supabase for related content or display fabricated social counts.

#### Scenario: Member opens a related memory
- **WHEN** a member selects a related Timeline or Vault card
- **THEN** the link opens the corresponding visibility-specific detail route

#### Scenario: No related memories exist
- **WHEN** there are no eligible related memories
- **THEN** the screen displays its existing empty state
