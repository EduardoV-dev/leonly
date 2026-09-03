## Purpose

Allow active-space members to express one private, lightweight reaction to each available shared
memory while showing authoritative aggregate reaction counts.

## ADDED Requirements

### Requirement: Authorized per-member reactions
The system SHALL allow an authenticated active member to read and mutate that member's reaction only on an
available Timeline or shared Private Vault memory in the member's active space. A reaction MUST have one of
the supported types: `heart`, `laugh`, `cry`, or `star`. The system MUST derive the member, space, and
reaction owner from authenticated active membership, and MUST NOT accept client-supplied owner or space
values as authority. A database constraint MUST ensure at most one current reaction for each membership and
memory pair.

#### Scenario: Active member reacts to an available Timeline memory
- **WHEN** an active member selects a supported reaction on an available Timeline memory in the active space
- **THEN** the system persists that member's one current reaction and returns the current reaction summary

#### Scenario: Active member reacts to an available Vault memory
- **WHEN** an active member selects a supported reaction on an available shared Private Vault memory
- **THEN** the system persists that member's one current reaction without changing memory visibility

#### Scenario: Request supplies altered ownership or space data
- **WHEN** a request supplies an owner or space identifier that differs from the authenticated membership
- **THEN** the system ignores or rejects that data and cannot create or change another member's reaction

#### Scenario: Unsupported reaction type is submitted
- **WHEN** a request supplies a reaction type other than `heart`, `laugh`, `cry`, or `star`
- **THEN** the system rejects the request without changing a persisted reaction

### Requirement: Add, replace, and remove semantics
Selecting a supported reaction when the active member has no current reaction SHALL create it. Selecting a
different supported reaction SHALL replace the member's current reaction atomically. Selecting the same
reaction type SHALL remove it. Each mutation response MUST return the caller's confirmed current selection,
which is null after removal, and counts for every supported reaction type from the authoritative current
reaction dataset. A mutation MUST NOT alter another membership's reaction.

#### Scenario: Member adds a first reaction
- **WHEN** a member with no current reaction selects `heart`
- **THEN** the member's confirmed selection becomes `heart` and the heart count reflects the new reaction

#### Scenario: Member changes a reaction
- **WHEN** a member with `heart` selected chooses `star`
- **THEN** the confirmed selection becomes `star`, the heart count decreases, and the star count increases

#### Scenario: Member removes a reaction
- **WHEN** a member with `laugh` selected chooses `laugh` again
- **THEN** the confirmed selection becomes null and the laugh count decreases

#### Scenario: Partner reaction exists
- **WHEN** one member adds, replaces, or removes a reaction while the other member has a current reaction
- **THEN** the other member's reaction remains unchanged

### Requirement: Non-enumerating unavailable reaction boundaries
The system SHALL return the generic memory not-found outcome and no reaction data when a reaction read or
mutation targets a malformed, missing, soft-deleted, inactive, cross-space, or inaccessible memory. An
unauthenticated or inactive member MUST not read or mutate reactions. The outcome MUST NOT disclose the
memory's existence, visibility, owner, space, membership state, or reaction counts.

#### Scenario: Memory is unavailable
- **WHEN** a reaction read or mutation targets a missing, soft-deleted, inactive, other-space, or inaccessible memory
- **THEN** the system returns the generic not-found outcome without reaction data or a mutation

#### Scenario: Membership is unavailable
- **WHEN** an unauthenticated user or inactive member reads or mutates reactions
- **THEN** the system exposes no reaction summary and persists no reaction

### Requirement: Deterministic reaction reconciliation
The system SHALL serialize reaction mutations initiated by one rendered control while a request is pending.
For same-member requests that overlap from separate clients, each completed mutation SHALL apply its
add, replace, or remove semantics atomically against the current persisted reaction, and every client SHALL
refetch the authoritative reaction summary after its mutation settles. The final displayed selection and
counts MUST equal the result of the last mutation to complete; the system MUST NOT treat a client-side
optimistic selection as authoritative after a failure or overlapping request.

#### Scenario: Repeated activation while pending
- **WHEN** a member repeatedly activates a reaction control before its mutation settles
- **THEN** the rendered control sends only the pending mutation and communicates that controls are unavailable

#### Scenario: Same member reacts from two clients
- **WHEN** two clients for the same active membership complete overlapping reaction mutations for one memory
- **THEN** each mutation is atomic and both clients converge to the final persisted summary after refresh

### Requirement: Accessible reaction feedback and recovery
The interface SHALL expose every reaction choice as a keyboard-operable control with an accessible name,
selected state, and current count. It MUST communicate selection, count, pending, success, and failure
without relying on color alone. While a mutation is pending, all choices for that memory control MUST be
disabled. On a recoverable failure, the interface MUST restore the last confirmed selection, refetch counts,
provide a retry path, and announce the outcome through an accessible status message.

#### Scenario: Keyboard member changes selection
- **WHEN** a keyboard member activates a different reaction choice
- **THEN** the selection and count update accessibly without requiring pointer input

#### Scenario: Reaction mutation fails
- **WHEN** a reaction mutation fails while the memory remains available
- **THEN** the control returns to its last confirmed selection, refreshes counts, and announces a retryable failure

#### Scenario: Memory becomes unavailable during mutation
- **WHEN** a reaction mutation returns the generic unavailable outcome
- **THEN** the interface transitions to the existing generic memory not-found experience with no stale reaction data
