## ADDED Requirements

### Requirement: Detail reaction summary and controls
The memory-detail reaction extension region SHALL display the authorized member's current reaction and
authoritative counts for every supported reaction type on an available Timeline or shared Private Vault
memory. It MUST provide accessible reaction controls, refresh the summary after every completed local action,
and preserve the detail page's existing unavailable outcome. Realtime partner updates are not required.

#### Scenario: Timeline detail shows reactions
- **WHEN** an active member opens an available Timeline memory detail
- **THEN** the detail reaction region displays current counts and that member's confirmed selection

#### Scenario: Vault detail shows reactions
- **WHEN** an active member opens an available shared Private Vault memory detail
- **THEN** the detail reaction region displays current counts and that member's confirmed selection

#### Scenario: Member reacts from detail
- **WHEN** a member completes a local reaction action in a memory detail view
- **THEN** the detail reaction region refreshes to the authoritative summary without changing memory visibility
