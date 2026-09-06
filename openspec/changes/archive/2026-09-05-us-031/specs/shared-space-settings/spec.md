## MODIFIED Requirements

### Requirement: Current-member settings ownership
The system SHALL present the authenticated member's membership display name and device-local language
separately from shared settings, SHALL clearly state that those values belong only to the current
member or browser profile, and SHALL provide the authorized inline display-name workflow and
functional language selector without exposing another membership as an editable target.

#### Scenario: Current member views personal settings
- **WHEN** Settings loads successfully
- **THEN** the system displays the current membership display name and active interface language in a
  personal-settings section and does not present the partner's preferences as editable

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

#### Scenario: Current member changes the interface language
- **WHEN** the current member selects English or Spanish in personal settings
- **THEN** Settings and every completed MVP interface surface use the selected language immediately
  without mutating the membership, account, active space, or partner preferences

#### Scenario: Settings reflows around the language selector
- **WHEN** personal settings are displayed on a supported mobile or desktop viewport
- **THEN** the language options, selected state, and feedback remain visible, operable, and in logical
  reading order
