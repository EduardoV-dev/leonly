## ADDED Requirements

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
