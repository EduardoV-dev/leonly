## MODIFIED Requirements

### Requirement: Contextual placement action on memory detail
The read-only Timeline and Vault detail screens SHALL NOT expose or mount move-to-Vault or move-to-Timeline controls. Timeline and Vault list cards MUST NOT add placement controls under this capability.

#### Scenario: Member views detail
- **WHEN** a member opens a Timeline or Vault detail screen
- **THEN** no placement action or placement request is present

#### Scenario: Timeline detail shows destination action
- **WHEN** a member opens Timeline detail
- **THEN** no placement action is shown

#### Scenario: Vault detail shows destination action
- **WHEN** a member opens Vault detail
- **THEN** no placement action is shown
