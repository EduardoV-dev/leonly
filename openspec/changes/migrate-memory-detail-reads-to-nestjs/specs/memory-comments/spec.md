## MODIFIED Requirements

### Requirement: Accessible responsive comments section
The migrated Timeline and Vault detail screens SHALL NOT mount or fetch the comments section while they are read-only. Existing comment functionality outside these screens is not migrated by this change.

#### Scenario: Member views detail at any supported width
- **WHEN** a member opens a Timeline or Vault detail screen at mobile or desktop widths
- **THEN** the screen contains no comment section, composer, comment controls, or comment requests

#### Scenario: Keyboard member submits a comment
- **WHEN** a keyboard user opens either read-only detail screen
- **THEN** no comment composer or submit action is available

#### Scenario: Validation fails
- **WHEN** a member views either read-only detail screen
- **THEN** no comment validation UI or comment request is initiated

#### Scenario: Layout reflows
- **WHEN** a member views either read-only detail screen at supported widths
- **THEN** no comment section is rendered
