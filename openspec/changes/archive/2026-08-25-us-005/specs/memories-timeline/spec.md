## MODIFIED Requirements

### Requirement: Timeline card summaries and extension regions

The system SHALL render each timeline memory as a card with its title, memory date, cover-photo preview or
fallback, and any available description and location previews. Each card MUST contain one accessible link
to that memory's UUID detail route while keeping stable extension regions for later memory-count and action
capabilities. The detail link MUST NOT interfere with current or later interactive controls in those regions.

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
- **THEN** that content is rendered in its designated extension region, remains independently interactive,
  and does not remove the timeline summary or detail link
