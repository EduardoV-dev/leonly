## MODIFIED Requirements

### Requirement: Authorized detail-only edit access
The Timeline and Vault detail screens SHALL NOT expose or mount an Edit action while those screens are read-only. This change does not migrate or remove the existing editor or its server-side authorization for other consumers.

#### Scenario: Member views detail
- **WHEN** a member opens a Timeline or Vault detail screen
- **THEN** no Edit action or edit request is present

#### Scenario: Active member edits from a timeline detail
- **WHEN** an active member opens Timeline detail
- **THEN** no Edit action is present

#### Scenario: Active member edits from a Vault detail
- **WHEN** an active member opens Vault detail
- **THEN** no Edit action is present

#### Scenario: Summary surfaces do not expose Edit
- **WHEN** a member views a memory summary
- **THEN** no Edit action is present

#### Scenario: Detail action adapts beside attribution
- **WHEN** a member opens detail at any supported width
- **THEN** creator attribution appears without an Edit action

#### Scenario: Member addresses an unavailable edit route
- **WHEN** a member directly addresses an unavailable legacy edit route
- **THEN** the existing server-side authorization remains in effect
