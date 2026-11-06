## Purpose

Define access, content, and feedback requirements for the active shared-space dashboard.

## Requirements

### Requirement: Active-space dashboard access
The system SHALL render the dashboard only for an authenticated active member's active shared space. It MUST redirect users without an active space to setup. Creating a space completes onboarding, so a one-member creator can access the dashboard while waiting for a partner.

#### Scenario: Active member views dashboard
- **WHEN** an authenticated user has an active space membership
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

### Requirement: Inclusive browser-local day counter
The system SHALL display the inclusive number of calendar days from the active space's valid
date-only `start_date` through the active member's browser-local calendar date. It MUST treat the
start date as day 1 and MUST NOT derive the count from elapsed 24-hour durations.

#### Scenario: Start date is local today
- **WHEN** the active space start date equals the member's browser-local calendar date
- **THEN** the dashboard displays `1 day together`

#### Scenario: Start date is local yesterday
- **WHEN** the active space start date is one calendar date before the member's browser-local date
- **THEN** the dashboard displays `2 days together`

#### Scenario: Count crosses calendar boundaries
- **WHEN** the inclusive range crosses a month, year, leap day, or daylight-saving boundary
- **THEN** the dashboard displays the number of calendar dates in the inclusive range

#### Scenario: Members use different timezones
- **WHEN** active members' browser-local calendar dates differ
- **THEN** each dashboard displays the count for that member's local calendar date

### Requirement: Current day-counter display
The system SHALL recalculate the day counter when the browser-local calendar date advances or the
active-space start date supplied to the dashboard changes. It SHALL make the counter available in
both one-member and two-member active spaces at supported viewports.

#### Scenario: Browser-local date advances
- **WHEN** the member keeps the dashboard open across local midnight or returns to it afterward
- **THEN** the displayed count advances without requiring a new login or manual reload

#### Scenario: Refreshed start date is supplied
- **WHEN** a successful start-date update refreshes the dashboard with the new date
- **THEN** the displayed count uses the new date without requiring a new login

#### Scenario: One-member space
- **WHEN** an active space has one active member and a valid start date
- **THEN** its dashboard displays the same day counter available to a two-member space

### Requirement: Safe start-date handling
The system SHALL accept only real `YYYY-MM-DD` start dates that are not later than the member's
browser-local calendar date at mutation boundaries. It MUST NOT display a count or derived start-date
copy when the active-space response contains a missing, malformed, invalid, or future start date.

#### Scenario: Mutation receives an invalid start date
- **WHEN** a start-date mutation receives an empty, malformed, nonexistent, or browser-local future
  date
- **THEN** the system rejects the request without changing the persisted start date

#### Scenario: Stored start date is unavailable
- **WHEN** the dashboard receives a missing, malformed, nonexistent, or browser-local future start
  date
- **THEN** it displays that the day count is unavailable with a retry action and no plausible count
  or derived `Since` date

### Requirement: New-backend recent-memory summary
The dashboard SHALL obtain recent memories through the authenticated Timeline list endpoint with the
existing four-item limit and newest-first ordering. It SHALL display only eligible new-backend Timeline
memories in the active space, omit comments and reactions, and use the same five-minute signed cover
URLs and accessible fallback as the full Timeline. It MUST NOT read legacy Supabase memories or
fabricate summary records.

#### Scenario: Eligible new-backend memories exist
- **WHEN** an active member opens a dashboard with more than four eligible Timeline memories
- **THEN** the recent-memory section displays the newest four in deterministic order without social
  metadata

#### Scenario: Only Vault, deleted, other-space, or legacy records exist
- **WHEN** no eligible new-backend Timeline memories exist for the active space
- **THEN** the recent-memory section displays its existing empty state without a Supabase fallback

#### Scenario: Recent-memory request fails
- **WHEN** the recent-memory endpoint fails
- **THEN** the section preserves its loading, error, and retry behavior and does not substitute sample
  or legacy records

#### Scenario: Recent memory has no ready cover
- **WHEN** an eligible recent memory has no ready cover or its authorized image cannot be delivered
- **THEN** the memory remains visible with the existing accessible cover fallback

#### Scenario: Recent-memory cover is ready
- **WHEN** the recent-memory response includes a ready cover
- **THEN** the browser requests its signed storage URL directly without the legacy image route or a new
  application image endpoint
