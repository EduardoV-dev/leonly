## MODIFIED Requirements

### Requirement: Detail extension regions respect visibility

Timeline and Vault detail screens SHALL enable reactions, migrated comments, and one contextual placement button for authorized memories: Move to Vault on Timeline detail and Move to Timeline on Vault detail. They MUST NOT render or mount memory edit or delete controls or issue those unsupported requests. The screens SHALL preserve gallery navigation, related-memory links, and contextual back navigation.

#### Scenario: Timeline memory detail is composed

- **WHEN** the detail view renders an authorized Timeline memory
- **THEN** reactions, comments, and Move to Vault are available while Move to Timeline, edit, and delete controls and their requests are absent

#### Scenario: Vault memory detail is composed

- **WHEN** the detail view renders an authorized Vault memory
- **THEN** reactions, comments, and Move to Timeline are available while Move to Vault, edit, and delete controls and their requests are absent
