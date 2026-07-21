## ADDED Requirements

### Requirement: Active-space dashboard access
The system SHALL render the dashboard only for an authenticated active member's active shared space. It MUST redirect users without an active space to setup and members with incomplete onboarding to the invite step.

#### Scenario: Active member views dashboard
- **WHEN** an authenticated user has an active, completed space membership
- **THEN** the system renders only that space's dashboard data

#### Scenario: User has no active space
- **WHEN** an authenticated user has no active space membership
- **THEN** the system redirects the user to shared-space setup

### Requirement: Truthful dashboard summaries
The system SHALL display space and active-member information from the active-space response, including a safe avatar fallback for an unavailable avatar. It MUST NOT render fabricated memories or places.

#### Scenario: Space has two active members
- **WHEN** the active-space response contains two active members
- **THEN** the dashboard displays both display names and each available avatar or its fallback

#### Scenario: Space has no persisted memories or places
- **WHEN** no memory or place records are available for the active space
- **THEN** the dashboard displays empty states instead of sample memory or ranking cards

### Requirement: Waiting state for an incomplete shared space
The system SHALL identify a space with one active member and display an invitation or waiting state without treating it as an error.

#### Scenario: Space has one active member
- **WHEN** the active-space response contains one active member
- **THEN** the dashboard displays the member and a waiting-to-join state

### Requirement: Future persisted dashboard records
The system SHALL render recent memories and top-rated active places only from persisted records belonging to the active space after their owning capabilities provide storage and queries. It MUST exclude records that the owning capability marks hidden, deleted, or inactive.

#### Scenario: Persisted records become available
- **WHEN** the memory and place capabilities provide visible active-space records
- **THEN** the dashboard renders those records in their respective summaries without using placeholder data

### Requirement: Dashboard load and failure feedback
The system SHALL provide a loading state while the dashboard is resolving and a recoverable error state when an unexpected dashboard query fails.

#### Scenario: Dashboard data is loading
- **WHEN** the dashboard route is waiting for its server data
- **THEN** the system displays a loading state

#### Scenario: Active-space query fails
- **WHEN** the active-space lookup fails unexpectedly
- **THEN** the system displays an error state with a retry path
