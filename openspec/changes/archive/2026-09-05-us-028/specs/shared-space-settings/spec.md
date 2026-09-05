## MODIFIED Requirements

### Requirement: Current-member settings ownership
The system SHALL present the authenticated member's membership display name separately from shared
settings, SHALL clearly state that the value belongs only to the current member, and SHALL provide the
authorized inline display-name update workflow without exposing another membership as an editable
target.

#### Scenario: Current member views personal settings
- **WHEN** Settings loads successfully
- **THEN** the system displays the current membership display name in a personal-settings section and
  does not present the partner's display name as editable by the current member

#### Scenario: Current member edits their display name
- **WHEN** the authenticated member activates the personal display-name edit control
- **THEN** the personal-settings section presents the current canonical name in the accessible edit
  workflow without submitting a membership, user, or space identifier

#### Scenario: Current member display name changes successfully
- **WHEN** the authenticated member saves a valid non-conflicting display name
- **THEN** Settings immediately displays the returned canonical value for that current member and
  reconciles other rendered membership-name consumers through an authoritative refresh

#### Scenario: Partner membership is displayed
- **WHEN** Settings includes another active member
- **THEN** the partner's display name remains readable but exposes no edit action to the current member

#### Scenario: Language action extension is not implemented yet
- **WHEN** the personal-settings section renders before language preference management is available
- **THEN** the layout preserves an understandable region for the future language control without
  implying that it is currently available
