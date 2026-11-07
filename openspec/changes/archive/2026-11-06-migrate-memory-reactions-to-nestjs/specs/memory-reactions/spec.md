# Spec Delta

## ADDED Requirements

### Requirement: Current-backend reaction source of truth

Reaction reads and writes SHALL use only the current backend's reaction dataset. Existing Supabase reactions SHALL NOT be read, imported, or used as fallback data. Reaction counts SHALL be derived from persisted reactions rather than independent counters.

#### Scenario: Only legacy reactions exist

- **WHEN** an authorized memory has no current-backend reactions but legacy Supabase reactions exist
- **THEN** its summary contains zero counts, empty member lists, and no current selection without querying Supabase

#### Scenario: Current-backend lookup fails

- **WHEN** an authorized reaction read fails unexpectedly
- **THEN** the operation reports a safe failure instead of returning fabricated zero counts or consulting Supabase

### Requirement: Complete authorized reaction summary

Each successful summary SHALL contain `counts`, `currentReaction`, and `members`. Both maps SHALL contain `heart`, `laugh`, `cry`, and `star`. Counts SHALL include only reactions by active members of the authorized space. Member lists SHALL contain those members' current display names in ascending display-name order. `currentReaction` SHALL be the caller's persisted type or null.

#### Scenario: Memory has no reactions

- **WHEN** an active member reads a memory with no eligible reactions
- **THEN** every count is zero, every member list is empty, and `currentReaction` is null

#### Scenario: Members react with different types

- **WHEN** Alex has selected `heart` and Sam has selected `laugh` on the authorized memory
- **THEN** the summary contains one heart and one laugh, the corresponding member names, and the requesting member's own selection

#### Scenario: Reacting member becomes inactive or changes their name

- **WHEN** a summary is read after a reacting membership is deleted or its display name changes
- **THEN** a deleted membership contributes no count or name and an active membership contributes its current display name

## MODIFIED Requirements

### Requirement: Deterministic reaction reconciliation

The system SHALL serialize mutations initiated by one rendered control while a request is pending. Overlapping same-member requests SHALL apply add, replace, or remove atomically against the persisted selection, including when no reaction exists. Each successful response SHALL contain the summary resulting from its transaction. Clients SHALL refetch the authoritative summary after mutation settlement and MUST NOT treat optimistic state as authoritative after failure.

#### Scenario: Repeated activation while pending

- **WHEN** a member repeatedly activates a reaction control before its mutation settles
- **THEN** the rendered control sends only the pending mutation and communicates that controls are unavailable

#### Scenario: Same member reacts from two clients

- **WHEN** two clients for the same active membership complete overlapping reaction mutations for one memory
- **THEN** each mutation applies atomically and both clients converge to the final persisted summary when refreshed after those mutations complete

#### Scenario: Two clients add the same first reaction

- **WHEN** two same-member requests select `heart` while no reaction initially exists
- **THEN** the serialized operations add and then remove the reaction, leaving no current selection or duplicate reaction

#### Scenario: Mutation fails before commit

- **WHEN** a database failure prevents a reaction transaction from committing
- **THEN** no partial reaction change is persisted and the client restores confirmed state and refetches the summary

#### Scenario: Mutation response is lost after commit

- **WHEN** a toggle commits but its response does not reach the client
- **THEN** the client reconciles through a summary read and does not automatically retry the non-idempotent toggle
