## Purpose

Allow active-space members to deliberately move a shared memory between the Timeline and Private Vault
without changing its content, ownership, media, or availability to the other active member.

## ADDED Requirements

### Requirement: Authorized bidirectional memory placement
The system SHALL allow either available active-space member to move an active memory between Timeline
and Private Vault. A request SHALL identify the target placement and MUST change only an eligible
memory's placement. The Private Vault remains shared by both active-space members and is not a security
boundary between them.

#### Scenario: Member moves a Timeline memory to the Private Vault
- **WHEN** an available member moves an active Timeline memory in that member's active space to Private
  Vault
- **THEN** the memory is absent from Timeline results and available in the shared Private Vault

#### Scenario: Member moves a Vault memory to Timeline
- **WHEN** an available member moves an active Vault memory in that member's active space to Timeline
- **THEN** the memory is absent from Private Vault results and available in the Timeline

#### Scenario: Placement preserves memory data
- **WHEN** either placement change succeeds
- **THEN** the memory's identifier, title, date, description, location, photos, creator, comments,
  reactions, and active status remain unchanged

### Requirement: Contextual placement action on memory detail
The system SHALL expose exactly one accessible placement action on an authorized direct memory-detail
page. The action MUST be named "Move to Private Vault" for a Timeline memory and "Move to Timeline" for
a Vault memory. Timeline and Vault list cards MUST NOT add placement controls under this capability.

#### Scenario: Timeline detail shows destination action
- **WHEN** an available member opens an authorized Timeline memory detail page
- **THEN** the page exposes one action named "Move to Private Vault"

#### Scenario: Vault detail shows destination action
- **WHEN** an available member opens an authorized Vault memory detail page
- **THEN** the page exposes one action named "Move to Timeline"

### Requirement: Successful placement feedback and destination detail
The system SHALL announce successful placement, refresh affected Timeline and Private Vault data, and
navigate to the moved memory's authorized detail route in its destination placement.

#### Scenario: Move to Private Vault succeeds
- **WHEN** a member successfully moves a Timeline memory to Private Vault
- **THEN** the member receives success feedback and is shown that memory's Vault detail page

#### Scenario: Move to Timeline succeeds
- **WHEN** a member successfully moves a Vault memory to Timeline
- **THEN** the member receives success feedback and is shown that memory's Timeline detail page

### Requirement: Safe placement mutation outcomes
The system SHALL permit at most one in-flight placement request from a detail page and SHALL not change
placement when a request fails. A request based on a stale memory version MUST not overwrite another
completed mutation; the system MUST refresh the detail so the member can retry from current state.
Missing, malformed, inactive, soft-deleted, other-space, inaccessible, or already-at-target memories
MUST produce the same generic unavailable outcome without disclosing record or lifecycle state.

#### Scenario: Repeated activation is prevented
- **WHEN** a member activates the placement action again while its request is pending
- **THEN** the system starts no additional placement request

#### Scenario: Concurrent mutation makes placement stale
- **WHEN** another completed mutation changes an eligible memory after the member opened its detail page
- **THEN** the placement request does not overwrite that mutation and the detail refreshes to current
  state

#### Scenario: Placement target is unavailable
- **WHEN** a member requests placement for a malformed, missing, inactive, soft-deleted, other-space,
  inaccessible, or already-at-target memory
- **THEN** the system returns the generic unavailable outcome without changing any memory data

#### Scenario: Placement request fails recoverably
- **WHEN** an eligible placement request cannot be completed because of a recoverable failure
- **THEN** the memory retains its prior placement and the member receives accessible retry guidance
