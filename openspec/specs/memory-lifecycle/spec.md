# Memory Lifecycle Specification

## Purpose

Define the persisted memory and photo-metadata contract plus the active-space authorization boundary
needed by downstream readers. This specification covers storage and authorization only; it does not
define creation APIs or UI, binary uploads, or memory/photo management flows.

## Requirements

### Requirement: Persist memory lifecycle state

The system SHALL persist each memory with a UUID identifier, exactly one UUID owning space, UUID creator,
content required by consumers, memory date, creation and update timestamps, nullable `deleted_at`, and
visibility. A `NULL` `deleted_at` means the memory is available. Creator attribution MUST NOT grant access
independently of available membership.

#### Scenario: Memory lifecycle data is stored

- GIVEN a memory record belongs to an existing space and creator
- WHEN its lifecycle state is persisted
- THEN all required UUID ownership, content, date, timestamp, deletion, and visibility data remains addressable

#### Scenario: Creator is not an authorization authority

- GIVEN a creator is no longer an available member of the memory's space
- WHEN the creator requests the memory
- THEN access is denied unless the requester independently has active-space authorization

### Requirement: Keep visibility and soft deletion independent

The system SHALL restrict visibility to the enum values `timeline` and `vault`. Visibility and soft
deletion MUST remain independently representable; changing one MUST NOT implicitly change the other.
Timeline eligibility SHALL require a null `deleted_at` timestamp and `timeline` visibility.

#### Scenario: Vault visibility is independent from deletion

- GIVEN an available memory has `vault` visibility
- WHEN timeline eligibility is evaluated
- THEN the memory is excluded without being treated as deleted

#### Scenario: Soft deletion is independent from visibility

- GIVEN a memory has `timeline` visibility and a soft-deletion timestamp
- WHEN timeline eligibility is evaluated
- THEN the memory is excluded while its visibility remains `timeline`

### Requirement: Preserve ordered photo metadata and cover integrity

The system SHALL persist photo metadata with a UUID identifier belonging to one memory with a deterministic
per-memory ordering position and an object-path reference. A memory MAY reference one cover photo, but any
cover reference MUST identify a photo belonging to that same memory. Photo availability MUST inherit from
its parent memory. Photo ordering and cover selection MUST remain valid without requiring binary upload
behavior.

#### Scenario: Photos retain deterministic order

- GIVEN multiple photo metadata records belong to one memory
- WHEN their metadata is read
- THEN each has a unique per-memory position and the records have a deterministic order

#### Scenario: Cover references another memory

- GIVEN a cover reference targets a photo belonging to a different memory
- WHEN the relationship is persisted
- THEN the system rejects the invalid relationship

### Requirement: Protect private photo objects by available-memory membership

The system SHALL store memory photo objects in a private Supabase Storage bucket. Each
`memory_photos.object_path` MUST identify an object whose name is scoped to that photo's owning space. A
requester MAY select object metadata or download an object only when authenticated as an available member
of the referenced photo's available parent memory space. Public bucket access, public object URLs, and
client-side service-role credentials MUST NOT be available.

The system SHALL permit a server-controlled creation workflow to stage a prospective photo object only
after it has derived an authenticated available member and that member's active space. A staged object MUST
remain unreadable to members until the parent memory and photo metadata are available. Each staged object
MUST be durably associated with its creation attempt before upload so that a failed or interrupted attempt
can remove it. The browser MUST NOT receive a storage object path or a credential that bypasses this
authorization boundary.

#### Scenario: Available member reads a cover object

- GIVEN a cover photo belongs to an available memory in the requester's available space
- WHEN the requester reads its object metadata or downloads the object
- THEN Storage authorizes the request for that object only

#### Scenario: Object belongs to an unavailable or other-space memory

- GIVEN a photo object is referenced by a deleted, unauthorized, or other-space parent memory
- WHEN the requester reads its object metadata or downloads the object
- THEN Storage returns no authorized object and exposes no parent-memory metadata

#### Scenario: Creation stages a prospective object

- GIVEN an authenticated available member starts an authorized memory-creation attempt
- WHEN the server stages a validated photo object for that attempt
- THEN the object is scoped to the member's active space, is unreadable before final persistence, and is
  tracked for completion or cleanup

#### Scenario: Staged creation cannot complete

- GIVEN a staged photo object belongs to a creation attempt that fails or is interrupted
- WHEN the attempt cannot persist an available parent memory and photo metadata
- THEN members cannot read the staged object and server-side cleanup removes it

### Requirement: Resolve private cover previews on the server

The system SHALL create a short-lived signed cover-photo URL only from a server-side resolver after it has
established the requested memory is available to the authenticated requester. The resolver MUST use the
photo's persisted `object_path`, MUST NOT accept a client-supplied object path as authorization, and MUST
return the same generic unavailable outcome used for missing, deleted, other-space, and unauthorized
memories. Signed URLs MUST NOT be persisted as memory metadata.

#### Scenario: Authorized memory receives a preview URL

- GIVEN an authenticated user resolves an available memory with a cover photo
- WHEN the server resolves its cover preview
- THEN it returns a short-lived signed URL for that cover object

#### Scenario: Unavailable memory requests a preview URL

- GIVEN a request targets a missing, deleted, other-space, or unauthorized memory
- WHEN the server resolves its cover preview
- THEN it returns the generic unavailable outcome without creating or returning a signed URL

### Requirement: Authorize through the available space

The system SHALL resolve memory availability only from the authenticated session user and that user's
available membership in the memory's available space. Client-supplied space or creator identity
MUST NOT establish authority. Authorized readers MAY resolve both timeline and vault memories in that
space, subject to each consumer's visibility rules.

#### Scenario: Active member resolves a memory

- GIVEN an authenticated user is an available member of the memory's available space
- WHEN the user resolves the memory and its metadata
- THEN only that space's authorized record and metadata are available

#### Scenario: Client supplies another space

- GIVEN a client supplies a space identifier different from the session-derived available space
- WHEN it requests memory data
- THEN the supplied identifier is ignored for authorization and no other-space record is returned

### Requirement: Make unavailable memories non-enumerating

The system MUST return the same generic not-found outcome for a missing, deleted, other-space, or
unauthorized memory. The response MUST NOT reveal whether a record exists, which
lifecycle state caused rejection, or any memory/photo metadata.

#### Scenario: Unavailable states are indistinguishable

- GIVEN requests target memories in any of the unavailable states
- WHEN the requests are resolved
- THEN every request receives the same generic not-found outcome with no distinguishable record data

### Requirement: Support US-003 timeline eligibility and ordering

The storage layer MUST provide indexes supporting available-space authorization and the US-003 query
predicates `(space, deleted_at is null, visibility = 'timeline')` plus descending order by memory date,
creation timestamp, and UUID identifier. Unique and partial-index predicates MUST use `deleted_at is
null`. These indexes MUST support bounded reads without requiring client-side filtering or sorting.

#### Scenario: Timeline read has stable eligible order

- GIVEN an available space contains eligible, Vault, and deleted memories
- WHEN a downstream timeline read requests eligible records
- THEN only eligible records are returned in memory-date, creation-time, and identifier descending order

### Requirement: Use UUID identifiers at application boundaries

The system SHALL use UUID primary keys for `spaces`, `space_members`, `memories`, and `memory_photos`.
Existing `users` and `join_attempt_limits` identifiers SHALL remain UUID. Every identifier exposed to the
application or an RPC MUST be a UUID string. `join_attempt_limits` remains transient and is outside the
soft-deletion lifecycle.

#### Scenario: RPC receives a memory identifier

- WHEN the application calls a memory lookup RPC with an identifier
- THEN the RPC accepts and returns UUID-string identifiers only
