## MODIFIED Requirements

### Requirement: Timeline card summaries and extension regions
The system SHALL render each timeline memory as a card with its title, memory date, cover-photo preview or
fallback, and any available description and location previews. Each card MUST contain one accessible link to
that memory's UUID detail route while keeping stable extension regions for memory counts and actions. The
detail link MUST NOT interfere with interactive controls in those regions.

#### Scenario: Memory has complete summary data
- **WHEN** an eligible memory has a cover photo, description, and location
- **THEN** its card displays all required and available summary fields

#### Scenario: Authorized cover response is unavailable
- **WHEN** an eligible memory has a cover photo but its authorized cover response is unavailable
- **THEN** its card renders the existing accessible cover-photo fallback without exposing Storage authority

#### Scenario: Member opens a memory from its timeline card
- **WHEN** a member activates an eligible memory card's detail link
- **THEN** the interface navigates to that memory's UUID detail route

#### Scenario: A capability supplies card content
- **WHEN** a capability contributes a count or action to a card
- **THEN** that content is rendered in its designated extension region, remains independently interactive,
  and does not remove the timeline summary or detail link

### Requirement: Private cover-media delivery
The system SHALL resolve an opaque same-origin cover media URL only after an authorized Timeline or detail
read establishes that the parent memory is available to the requesting member. Every media request MUST
reauthorize the parent memory before returning bytes. The UI MUST NOT receive, derive, construct, expose, or
otherwise use a Storage object path, signed Storage credential, or redirect to a Storage URL. If a memory has
no cover photo or authorized media delivery fails, the UI MUST render its existing accessible fallback. This
delivery contract MUST NOT change pagination, ordering, eligibility, active-space authorization, Vault
exclusion, or generic not-found behavior.

#### Scenario: Authorized cover photo is displayed
- **WHEN** an authorized Timeline or detail read returns an available memory with a resolvable cover photo
- **THEN** the UI requests its opaque media URL and receives bytes only after current authorization succeeds

#### Scenario: Cover photo is absent or delivery fails
- **WHEN** an authorized Timeline or detail read has no cover photo or cannot deliver its authorized media
- **THEN** the response exposes no Storage authority and the UI renders the existing accessible fallback

#### Scenario: Unavailable memory includes a cover photo
- **WHEN** a Timeline, detail, or media read cannot establish that a memory is currently available
- **THEN** the server returns no photo bytes or Storage authority and preserves the existing exclusion or
  generic not-found outcome
