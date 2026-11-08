## MODIFIED Requirements

### Requirement: Detail extension regions respect visibility

Timeline and Vault detail screens SHALL enable reactions and the migrated comments section for authorized memories. They MUST NOT render or mount memory edit, delete, move, or restore controls or issue those unsupported action requests. The screens SHALL preserve gallery navigation, related-memory links, and contextual back navigation.

#### Scenario: Timeline memory detail is composed
- **WHEN** the detail view renders an available timeline memory
- **THEN** reactions and comments are available while unsupported memory mutation controls and requests are absent

#### Scenario: Vault memory detail is composed
- **WHEN** the detail view renders an available Vault memory
- **THEN** reactions and comments are available while unsupported memory mutation controls and requests are absent
