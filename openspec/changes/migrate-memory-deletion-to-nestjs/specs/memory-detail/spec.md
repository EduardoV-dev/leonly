## MODIFIED Requirements

### Requirement: Detail extension regions respect visibility

Timeline and Vault detail screens SHALL enable reactions, migrated comments, one contextual placement
button, and one Delete action for authorized memories. The Delete action is available only on detail
screens: Move to Vault on Timeline detail and Move to Timeline on Vault detail. The screens MUST NOT render
or mount memory edit controls or issue unsupported edit requests. The screens SHALL preserve gallery
navigation, related-memory links, and contextual back navigation.

#### Scenario: Timeline memory detail is composed

- **WHEN** the detail view renders an authorized Timeline memory
- **THEN** reactions, comments, Move to Vault, and Delete are available while Move to Timeline and edit controls and their requests are absent

#### Scenario: Vault memory detail is composed

- **WHEN** the detail view renders an authorized Vault memory
- **THEN** reactions, comments, Move to Timeline, and Delete are available while Move to Vault and edit controls and their requests are absent
