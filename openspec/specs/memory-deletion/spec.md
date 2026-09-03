## Purpose

Allow either active-space member to remove a shared memory from every product surface immediately while
retaining its records and media under the MVP retention policy.

## Requirements

### Requirement: Authorized versioned memory soft deletion
The system SHALL allow either authenticated active member to soft-delete an active Timeline or shared
Private Vault memory in that member's active space. The server MUST derive the member, space, memory, and
current placement from the authenticated session and MUST NOT trust client-supplied ownership or space
values. The request MUST carry the server-owned memory version shown to the member and, on success, SHALL
set the memory deletion timestamp without hard-deleting or altering retained memory, photo, comment, or
reaction records.

#### Scenario: Active member deletes a Timeline memory
- **WHEN** either active member confirms deletion of an available Timeline memory using its current version
- **THEN** the system records its deletion timestamp and returns a successful deletion outcome

#### Scenario: Active member deletes a Vault memory
- **WHEN** either active member confirms deletion of an available shared Private Vault memory using its
  current version
- **THEN** the system records its deletion timestamp without changing retained placement or related records

#### Scenario: Target is unavailable
- **WHEN** deletion targets a malformed, missing, inactive, already soft-deleted, cross-space, or inaccessible
  memory
- **THEN** the system makes no change and returns the same generic not-found outcome without exposing target
  state

### Requirement: Complete post-deletion unavailability
After deletion succeeds, the memory and its retained photos, comments, and reactions MUST be unavailable
through every product, API, direct media, and Storage access path. The deleted memory, comments, and
reactions MUST NOT contribute to Timeline, Vault, dashboard, comment, reaction, or other derived counts and
aggregates. The system MUST retain the underlying records and media until a separately defined retention or
hard-deletion policy removes them.

#### Scenario: Product projections refresh after deletion
- **WHEN** a memory deletion succeeds
- **THEN** subsequent Timeline, Vault, dashboard, detail, comment, reaction, count, and aggregate reads omit
  the memory and all of its related data

#### Scenario: Retained photo is requested after deletion
- **WHEN** any caller requests a retained photo through a product media route, an authenticated Storage route,
  or a previously rendered browser media URL after deletion succeeds
- **THEN** no photo bytes, redirect, signed credential, object path, or parent-memory metadata are exposed

#### Scenario: Deleted memory is addressed directly
- **WHEN** a caller addresses the deleted memory, its comments, its reactions, or repeats the deletion request
- **THEN** the system returns the same generic not-found outcome used for every unavailable memory

### Requirement: Confirmed deletion on direct memory detail
The interface SHALL expose an accessible Delete action for either active member only on direct Timeline and
shared Private Vault memory detail views. Timeline, Vault, dashboard, recent-memory, and related-memory cards
or other summary surfaces MUST NOT expose the action. Deletion MUST require explicit destructive confirmation
that explains the memory will disappear for both members while retained deletion is not presented as
permanent erasure. Cancelling or dismissing confirmation MUST send no request and leave the memory unchanged.

#### Scenario: Member views a summary surface
- **WHEN** a member views a memory through a Timeline, Vault, dashboard, recent-memory, or related-memory card
- **THEN** that surface provides no Delete action

#### Scenario: Member cancels deletion
- **WHEN** a member opens the deletion confirmation and cancels or dismisses it
- **THEN** no deletion request is sent, the memory remains in its prior placement, and focus returns to the
  invoking control

#### Scenario: Member confirms deletion by keyboard
- **WHEN** a keyboard member opens the confirmation, reviews it, and confirms deletion
- **THEN** the request can complete without pointer input and pending state and focus remain understandable

### Requirement: Detail deletion success and recoverable failure
On successful deletion from detail, the interface SHALL navigate to the memory's prior Timeline or shared
Private Vault collection, reconcile affected projections from their first page, and announce localized success
without a persistent success query parameter. A recoverable failure MUST keep the member on the current detail,
leave the memory active in its prior placement, and provide accessible retry guidance without claiming success.

#### Scenario: Detail deletion succeeds
- **WHEN** deletion succeeds from a direct Timeline or Vault detail view
- **THEN** the member is taken to the corresponding prior collection and receives accessible success feedback

#### Scenario: Deletion fails recoverably
- **WHEN** an eligible deletion cannot complete for a recoverable reason
- **THEN** the memory remains active in its prior placement and the interface reports a retryable failure

#### Scenario: Deletion response is indeterminate
- **WHEN** a deletion request ends without a reliable server outcome
- **THEN** the interface reauthorizes the memory before presenting retry, treats generic unavailability as
  completed deletion, and otherwise keeps the current memory available for retry

### Requirement: Single-flight deletion and deterministic mutation conflicts
Each rendered deletion flow MUST start at most one request while pending and disable its conflicting memory
actions. Memory edit, placement, restore, and deletion requests SHALL serialize against the memory lifecycle
and use its expected version: the first memory-level mutation to commit wins, a later stale request MUST make
no change, and a target deleted first MUST return generic unavailable rather than conflict. Comment and
reaction writes SHALL serialize against the same parent lifecycle boundary: a related write committed first
may succeed and is then retained but hidden by deletion, while a deletion committed first makes the related
write generically unavailable.

#### Scenario: Delete is activated repeatedly while pending
- **WHEN** a member activates confirmation more than once before the deletion request settles
- **THEN** the interface sends only the pending logical deletion request

#### Scenario: Another memory mutation commits first
- **WHEN** an edit, move, or restore commits after the member opened deletion confirmation but before deletion
- **THEN** deletion makes no change, returns a conflict to the still-authorized member, and requires refresh
  before a new deletion attempt

#### Scenario: Deletion commits before another memory mutation
- **WHEN** deletion commits before an overlapping edit, move, restore, or repeated deletion
- **THEN** the later request makes no change and receives the generic unavailable outcome

#### Scenario: Related mutation commits before deletion
- **WHEN** a comment or reaction mutation commits before an overlapping deletion
- **THEN** that mutation may report success and the later deletion retains but hides its result with the
  deleted memory

#### Scenario: Deletion commits before a related mutation
- **WHEN** deletion commits before an overlapping comment or reaction mutation
- **THEN** the related mutation persists no change and receives the generic unavailable outcome
