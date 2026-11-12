## MODIFIED Requirements

### Requirement: Authorized versioned memory soft deletion
The system SHALL allow either authenticated active member to soft-delete an active Timeline or shared
Private Vault memory in that member's active space through the current backend. The server MUST derive
the member, space, memory, and current placement from the authenticated session and MUST NOT trust
client-supplied ownership or space values. Deletion SHALL require no request body or version token and
SHALL operate on the current authorized state after locking. It SHALL soft-delete comments and reactions,
mark attached files and derivatives `deleting`, then soft-delete the memory. No row or object is hard-deleted.

#### Scenario: Active member deletes a Timeline memory
- **WHEN** either active member confirms deletion of an available Timeline memory
- **THEN** the system soft-deletes its comments, reactions, and files, then records its deletion timestamp, and returns a successful deletion outcome

#### Scenario: Active member deletes a Vault memory
- **WHEN** either active member confirms deletion of an available shared Private Vault memory
- **THEN** the system soft-deletes its comments, reactions, and files, then records its deletion timestamp without changing retained placement

#### Scenario: Memory changed after confirmation opened
- **WHEN** another mutation commits after confirmation opens but before deletion acquires its lock
- **THEN** deletion applies to the current available memory and its committed children without comparing the previously displayed version

#### Scenario: Target is unavailable
- **WHEN** deletion targets a missing, inactive, already soft-deleted, cross-space, or inaccessible memory
- **THEN** the system makes no change and returns the same generic not-found outcome without exposing target state

#### Scenario: Target identifier is malformed
- **WHEN** deletion targets an identifier that is not a valid UUID
- **THEN** the system makes no change and rejects the request with the shared validation failure before any lookup

### Requirement: Complete post-deletion unavailability
After deletion succeeds, the memory and its retained photos, comments, and reactions MUST be unavailable
through product and API access paths, except that previously issued signed media URLs MAY remain usable
until their expiry, at most 300 seconds after issuance. Comments and reactions of the deleted
memory MUST carry their own deletion timestamps and its attached files MUST be in the `deleting` state.
The deleted memory, comments, and reactions MUST NOT contribute to Timeline, Vault, dashboard, comment,
reaction, or other derived counts and aggregates. The system MUST retain the underlying rows and objects
until a separately defined retention or hard-deletion policy removes them.

#### Scenario: Product projections refresh after deletion
- **WHEN** a memory deletion succeeds
- **THEN** subsequent Timeline, Vault, dashboard, detail, comment, reaction, count, and aggregate reads omit the memory and all of its related data

#### Scenario: Retained photo is requested after deletion
- **WHEN** any caller requests a retained photo through a product media route or an authenticated API read after deletion succeeds
- **THEN** no photo bytes, redirect, new signed credential, object path, or parent-memory metadata is exposed

#### Scenario: Previously issued photo URL is used within its expiry
- **WHEN** a browser that received a signed photo URL before deletion requests that URL within its five-minute expiry
- **THEN** storage MAY serve the object, and no new URL is issued for the deleted memory

#### Scenario: Previously issued photo URL is used after its expiry
- **WHEN** a signed photo URL issued before deletion is requested after its expiry
- **THEN** storage denies the request

#### Scenario: Deleted memory is addressed directly
- **WHEN** a caller addresses the deleted memory, its comments, its reactions, or repeats the deletion request
- **THEN** the system returns the same generic not-found outcome used for every unavailable memory

### Requirement: Single-flight deletion and deterministic mutation conflicts
Each rendered deletion flow SHALL send at most one request while pending and disable conflicting actions.
Deletion SHALL serialize through the parent-memory row and use its current state without a version token.
Other mutations retain their own version contracts, but MUST recheck parent availability after acquiring
the shared lock and return generic unavailable if deletion committed first.

#### Scenario: Delete is activated repeatedly while pending
- **WHEN** a member activates confirmation more than once before the request settles
- **THEN** the interface sends only the pending logical deletion request

#### Scenario: Another memory mutation commits first
- **WHEN** an edit, placement, or restore commits before deletion acquires the parent lock
- **THEN** deletion cascades over the current available state without a version conflict

#### Scenario: Deletion commits before another memory mutation
- **WHEN** another memory mutation waits until deletion commits
- **THEN** it rechecks availability, persists nothing, and returns generic unavailable instead of a stale-version conflict

#### Scenario: Related mutation commits before deletion
- **WHEN** a comment or reaction mutation commits before deletion obtains the parent lock
- **THEN** its result is included in the deletion cascade

#### Scenario: Deletion commits before a related mutation
- **WHEN** a comment or reaction mutation acquires the parent lock after deletion commits
- **THEN** it persists nothing and receives the generic unavailable outcome

## ADDED Requirements

### Requirement: Ordered cascading soft deletion
Memory deletion SHALL run as one atomic transaction that marks the memory's comments, reactions, and files
before it marks the memory itself.

#### Scenario: Cascade order within one transaction
- **WHEN** a valid deletion request runs
- **THEN** the system locks the membership and then the memory, soft-deletes all comments (including replies) and all reactions, marks attached files and their derivatives `deleting`, and only then sets the memory's deletion timestamp, all in one transaction

#### Scenario: Full cascade commits together
- **WHEN** every cascade step succeeds
- **THEN** the memory, its comments, its reactions, and its attached files are all marked deleted or deleting in one committed transaction

#### Scenario: Memory is never deleted without its children
- **WHEN** any cascade step fails or is not reached
- **THEN** no step commits, the memory keeps no deletion timestamp, and its comments, reactions, and files are unchanged

#### Scenario: A cascade step fails
- **WHEN** marking a comment, reaction, or file fails after the memory lock is held
- **THEN** no step commits, the memory remains active, and the request returns a safe server error

#### Scenario: Comment is written before deletion commits
- **WHEN** a comment write commits before the deletion acquires the memory lock
- **THEN** that comment is included in the cascade and is soft-deleted with the memory

#### Scenario: Comment or reaction arrives after deletion commits
- **WHEN** a comment or reaction write waits on the memory lock until deletion commits
- **THEN** the write receives the generic unavailable outcome and persists nothing

### Requirement: Related mutations participate in parent lifecycle locking
Comment creation, replies, edits, removals, and reaction mutations SHALL acquire the shared parent-memory
row lock inside the transaction performing their mutation and recheck active membership and parent
availability after waiting. Locks MUST remain held through commit or rollback and follow a consistent order.

#### Scenario: Comment edit or removal waits behind deletion
- **WHEN** a comment edit or removal acquires the parent lock after deletion commits
- **THEN** it returns generic unavailable before checking the comment version and makes no change

#### Scenario: Unrelated memory is mutated
- **WHEN** another request mutates a different memory
- **THEN** the target-memory lock does not require an exclusive whole-table lock

#### Scenario: Child rows are updated
- **WHEN** the cascade updates comments, reactions, and files
- **THEN** normal update row locks protect those writes without requiring a separate locking select for each child

### Requirement: Deleted memory files are marked for cleanup
Files attached to a deleted memory, and their derivatives, SHALL move to the `deleting` state as part of the
deletion transaction. Marking a file `deleting` MUST NOT remove its storage object. Physical removal of
`deleting` objects is executed by a separately defined cleanup capability and is out of scope for this
change. Files in the `deleting` state MUST NOT be served, attached to another memory, or revived by
image processing.

#### Scenario: Attached original and its derivatives are marked
- **WHEN** a memory with an attached original and generated variants is deleted
- **THEN** the original and each variant record move to `deleting` and their storage objects remain in place

#### Scenario: Image processing finishes after deletion
- **WHEN** an image-processing attempt for a `deleting` file completes after deletion commits
- **THEN** it does not change the file back to `ready` or `uploaded` or publish active derivative records; storage writes already in flight remain attributable for deferred cleanup

#### Scenario: Deleting file is requested for attachment
- **WHEN** an edit or creation request tries to attach a `deleting` file
- **THEN** the attachment is rejected without changing the file

#### Scenario: Cleanup execution is not triggered by deletion
- **WHEN** a memory deletion commits
- **THEN** no storage object is removed by that request and no cleanup run is scheduled as part of it
