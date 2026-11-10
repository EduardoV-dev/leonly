## MODIFIED Requirements

### Requirement: Authorized bidirectional memory placement

The system SHALL allow either available active-space member to move an active current-backend memory between Timeline and Private Vault. A request SHALL identify the target placement and MUST change only an eligible memory's placement and mutation audit fields. The Private Vault remains shared by both active-space members and is not a security boundary between them. Placement MUST NOT read or mutate legacy Supabase memories.

#### Scenario: Member moves a Timeline memory to the Private Vault

- **WHEN** either available member moves an active Timeline memory in that member's active space to Private Vault
- **THEN** the memory is absent from Timeline results and available in the shared Private Vault

#### Scenario: Member moves a Vault memory to Timeline

- **WHEN** either available member moves an active Vault memory in that member's active space to Timeline
- **THEN** the memory is absent from Private Vault results and available in the Timeline

#### Scenario: Placement preserves memory data

- **WHEN** either placement change succeeds
- **THEN** the memory's identifier, title, date, description, location, photos, creator, comments, reactions, and active status remain unchanged

#### Scenario: Only a legacy memory exists

- **WHEN** placement targets an identifier that exists only in Supabase
- **THEN** the system returns the generic unavailable outcome without reading, importing, or changing legacy records

### Requirement: Contextual placement action on memory detail

Timeline memory detail SHALL show a Move to Vault button, and Vault memory detail SHALL show a Move to Timeline button, for an authorized active memory. Each detail SHALL expose only the action for its opposite placement. Placement buttons MUST appear only on memory detail pages, never on Timeline, Vault, dashboard, recent-memory, related-memory cards, or other summary surfaces.

#### Scenario: Member views detail

- **WHEN** an active member opens an available Timeline or Vault memory detail screen
- **THEN** a keyboard-operable placement button with an accessible destination name is present

#### Scenario: Timeline detail shows destination action

- **WHEN** a member opens an available Timeline memory detail page
- **THEN** Move to Vault is available and Move to Timeline is absent

#### Scenario: Vault detail shows destination action

- **WHEN** a member opens an available Vault memory detail page
- **THEN** Move to Timeline is available and Move to Vault is absent

#### Scenario: Member views a summary surface

- **WHEN** a member views a Timeline, Vault, dashboard, recent-memory, or related-memory card or another summary surface
- **THEN** no placement button is mounted and no placement request is initiated there

### Requirement: Successful placement feedback and destination detail

When an authorized detail-page placement mutation succeeds, the system SHALL announce success, refresh affected Timeline, Private Vault, dashboard, and related-memory data, and navigate to the moved memory's authorized detail route in its destination placement. Both active members SHALL retain authorized access to that memory and its related data in the destination.

#### Scenario: Move to Private Vault succeeds

- **WHEN** a member successfully moves a Timeline memory to Private Vault
- **THEN** the member receives success feedback and is shown that memory's Vault detail page with Move to Timeline available and affected views refreshed

#### Scenario: Move to Timeline succeeds

- **WHEN** a member successfully moves a Vault memory to Timeline
- **THEN** the member receives success feedback and is shown that memory's Timeline detail page with Move to Vault available and affected views refreshed

#### Scenario: Other member opens the moved memory

- **WHEN** the other active member opens destination detail after a successful move
- **THEN** the same memory, photos, metadata, creator, comments, and reactions remain authorized and available

## ADDED Requirements

### Requirement: Atomic placement authorization and version checks

Placement SHALL derive the caller and active space from the authenticated session and atomically verify current membership, space availability, memory eligibility, and `lastKnownUpdatedAt`. Overlapping placement and current-backend lifecycle mutations MUST serialize. Every successful placement SHALL advance the precision-preserving memory update timestamp; no failed placement SHALL partially change data.

#### Scenario: Two members submit the same move

- **WHEN** two members submit placement for the same memory version and destination concurrently
- **THEN** at most one succeeds and the other receives the generic unavailable outcome because the memory is already at its target

#### Scenario: Another mutation wins before placement

- **WHEN** an eligible memory's version changes before placement commits
- **THEN** placement returns a conflict without overwriting the newer mutation

#### Scenario: Access is revoked before placement

- **WHEN** membership, space, or memory becomes unavailable before the placement eligibility check completes
- **THEN** the request returns the generic unavailable outcome without changing placement

#### Scenario: Transaction fails

- **WHEN** a storage failure prevents placement from committing
- **THEN** prior placement and related data remain unchanged and a safe recoverable failure is returned
