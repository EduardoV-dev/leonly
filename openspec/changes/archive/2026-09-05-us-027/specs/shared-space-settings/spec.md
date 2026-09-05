## MODIFIED Requirements

### Requirement: Shared-space summary
The system SHALL identify settings owned by both members, SHALL display the active space name and
date-only start date without converting the stored date through a timezone, and SHALL provide the
authorized inline rename and start-date correction workflows.

#### Scenario: Shared values are available
- **WHEN** Settings loads an active space with a name and start date
- **THEN** the system presents both values in a section identified as shared by the space members

#### Scenario: Active member edits the space name
- **WHEN** either active member activates the space-name edit control
- **THEN** the shared section presents the current canonical name in the accessible rename workflow
  without exposing a space or membership identifier

#### Scenario: Space name changes successfully
- **WHEN** the active member saves a valid non-conflicting space name
- **THEN** the shared section displays the returned canonical name and reconciles every other rendered
  space-name consumer through an authoritative refresh

#### Scenario: Active member edits the start date
- **WHEN** either active member activates the start-date edit control
- **THEN** the shared section presents the current canonical date in the accessible correction
  workflow without exposing a space or membership identifier

#### Scenario: Start date changes successfully
- **WHEN** the active member saves a valid non-conflicting start date
- **THEN** the shared section displays the returned canonical date and reconciles the inclusive
  dashboard counter through an authoritative refresh
