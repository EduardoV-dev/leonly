## MODIFIED Requirements

### Requirement: Shared-space summary
The system SHALL identify settings owned by both members, SHALL display the active space name and
date-only start date without converting the stored date through a timezone, and SHALL provide the
authorized space-name rename workflow while reserving the start-date action for a later story.

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

#### Scenario: Start-date action is not implemented yet
- **WHEN** the US-026 shared section renders the start date
- **THEN** the layout preserves an understandable region for the future start-date action without
  rendering a misleading or inoperable control
