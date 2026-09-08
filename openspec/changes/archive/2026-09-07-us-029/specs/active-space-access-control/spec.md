## ADDED Requirements

### Requirement: Active-space authorization matrix

The system SHALL enforce the following authorization matrix for every product read and mutation.
Identity, active membership, active space, and member ownership MUST be derived from the authenticated
session and persisted relationships. Submitted space, user, membership, owner, creator, author, or
storage-path identity MUST NOT grant authority.

| Resource | Active-member read | Create | Update or delete |
| --- | --- | --- | --- |
| Active space and shared settings | Either active member | Space setup rules only | Either active member |
| Membership and display name | Active members in the same active space | Space setup rules only | Owning membership only |
| Shared memory and metadata | Either active member | Authenticated membership becomes creator | Either active member |
| Memory photo and private object | Either active member | Same-space memory workflow | Either active member |
| Comment | Either active member | Authenticated membership becomes author | Authoring membership only |
| Reaction | Aggregate and own selection only | Authenticated membership becomes owner | Owning membership only |

#### Scenario: Active member accesses a shared record

- **WHEN** either active member reads or mutates an available shared memory or shared setting in the
  active space
- **THEN** the system permits the operation without using its informational creator as an ownership
  restriction

#### Scenario: Member mutates an owned record

- **WHEN** an active member mutates their own comment, reaction, or membership display name
- **THEN** the system permits the operation after deriving ownership from the authenticated membership

#### Scenario: Member mutates another member's owned record

- **WHEN** an active member attempts to update or delete the partner's comment, reaction, or display name
- **THEN** the system changes no record and returns the generic not-found outcome

#### Scenario: Request submits authority fields

- **WHEN** a request adds or alters a space, user, membership, owner, creator, or author identifier
- **THEN** the system rejects or ignores that authority and cannot broaden the caller's access

### Requirement: Active and available resource chain

Every protected operation SHALL require an authenticated user, an active membership, an active space,
and an active target whose complete parent chain belongs to that space. Reads MUST exclude soft-deleted
records and mutations MUST treat them as unavailable. A memory child MUST become inaccessible whenever
its memory, membership, or space becomes inactive or unavailable.

#### Scenario: User is unauthenticated

- **WHEN** an unauthenticated request attempts a protected read, mutation, aggregate, route, or file
  download
- **THEN** the system returns no private data and makes no persistent change

#### Scenario: Membership or space is inactive

- **WHEN** a user with an inactive membership or membership in an inactive space attempts a protected
  operation
- **THEN** the system returns no private data and makes no persistent change

#### Scenario: Target or parent is soft-deleted

- **WHEN** a protected operation targets a soft-deleted record or a child of an unavailable parent
- **THEN** the target is treated as unavailable and no child data or metadata is exposed

#### Scenario: Target belongs to another active space

- **WHEN** an active member substitutes a valid identifier or path belonging to another space
- **THEN** the system returns no target attributes and makes no change

### Requirement: Uniform non-enumerating resource outcome

Every HTTP boundary that addresses a private resource SHALL return status `404` with the exact JSON body
`{"code":"not_found","error":"Resource not found."}` when any submitted resource identifier is
malformed, missing, inactive, soft-deleted, outside the active space, or inaccessible to the requested
operation. The response MUST contain no resource attributes or reason-specific fields. Session-only
boundaries that do not address a private resource MAY use `401` for a missing authenticated session.

#### Scenario: Resource identifier is unavailable

- **WHEN** a direct resource request uses a malformed, missing, inactive, soft-deleted, cross-space, or
  ownership-inaccessible identifier
- **THEN** every case returns the same `404` status, headers relevant to disclosure, and JSON response body

#### Scenario: Unauthorized mutation has a current version

- **WHEN** a caller supplies a valid current revision for a resource they cannot mutate
- **THEN** the system returns the generic not-found outcome rather than conflict or validation details

#### Scenario: Session-only request is unauthenticated

- **WHEN** an unauthenticated request reaches a boundary that validates only session state and addresses
  no private resource
- **THEN** the boundary may return `401` without exposing private data

### Requirement: Isolated collections and aggregates

Every collection, pagination, count, reaction summary, comment total, rating, and related metadata query
SHALL derive its active-space scope from the authenticated membership. Results MUST omit inactive,
soft-deleted, inaccessible, and other-space rows before ordering, pagination, or aggregation. Cursors and
child identifiers MUST NOT permit a caller to expand that scope.

#### Scenario: Collection contains records from several spaces

- **WHEN** an active member requests a collection whose underlying tables contain other-space rows
- **THEN** the response contains only available rows from the member's active space

#### Scenario: Aggregate includes hidden child rows

- **WHEN** a memory has soft-deleted children or the database contains children from another space
- **THEN** counts and summaries are computed only from active authorized children

#### Scenario: Cursor names another space's record

- **WHEN** an active member supplies a validly shaped cursor anchored to an inaccessible record
- **THEN** the response reveals neither the anchor nor records outside the authorized collection

### Requirement: Database and storage enforcement

Every exposed MVP table SHALL have RLS enabled with least-privilege policies for each permitted operation,
and every private bucket SHALL have equivalent object policies. Foreign keys, checks, partial uniqueness,
and cardinality constraints SHALL preserve valid space membership, parentage, ownership, and one-reaction
semantics independently of application checks. Security-definer functions MUST use a fixed search path,
schema-qualified objects, least-privilege execute grants, and authenticated identity where they serve a
product request.

#### Scenario: Authenticated client bypasses the application

- **WHEN** an authenticated member queries a table or storage bucket directly
- **THEN** RLS or storage policy permits only operations authorized by the matrix

#### Scenario: Anonymous client accesses persistence directly

- **WHEN** an anonymous client reads or mutates an exposed table or private bucket
- **THEN** the database or storage layer returns no private data and makes no change

#### Scenario: Concurrent writes challenge an invariant

- **WHEN** concurrent requests attempt to exceed membership cardinality, duplicate a member-owned
  reaction, reuse a uniqueness key, or mutate stale ownership state
- **THEN** database constraints or atomic functions allow only a valid final state

#### Scenario: Product path invokes privileged access

- **WHEN** a user-initiated product request reaches a database or storage operation
- **THEN** privileged credentials do not replace authenticated active-membership authorization or bypass
  the policies governing that operation

### Requirement: Cross-feature security verification

The release gate SHALL maintain an operation-by-resource inventory covering spaces, memberships,
memories, photos, comments, reactions, settings, and storage objects. Automated web tests MUST exercise
applicable direct-resource, aggregate, altered-identifier, inactive, soft-deleted, cross-space, and
ownership-mismatch outcomes. Migration-contract checks MUST verify that exposed tables and private storage
have the required policies, product RPCs derive identity from `auth.uid()`, obsolete privileged signatures
are absent, database invariants are declared, and only bounded cleanup retains service-role execution.

#### Scenario: Resource authorization is reviewed

- **WHEN** the security suite evaluates one resource row in the inventory
- **THEN** every applicable product boundary and persistence contract has an executable assertion or an
  explicit not-applicable rationale

#### Scenario: Product boundary bypasses policy enforcement

- **WHEN** a product server path trusts a submitted authority field or uses privileged access without an
  equivalent active-member check
- **THEN** verification fails and the owning feature is not release-ready

#### Scenario: Denied response leaks attributes

- **WHEN** any denial response includes target-specific attributes, counts, ownership, state, or a
  reason-specific outcome
- **THEN** verification fails
