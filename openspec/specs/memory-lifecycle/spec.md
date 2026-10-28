# Memory Lifecycle Specification

## Purpose

Define the persisted memory and photo-metadata contract plus the active-space authorization boundary
needed by downstream readers. This specification covers storage and authorization only; it does not
define creation APIs or UI, binary uploads, or memory/photo management flows.

## Requirements

### Requirement: Persist memory lifecycle state

The system SHALL persist each memory with a UUID identifier, exactly one UUID owning space, creator membership and stable creator-user attribution compatible with the API identity model, content required by consumers, memory date, timestamps, nullable deletion timestamp, and visibility. It SHALL additionally persist its immutable creation key/hash. A null deletion timestamp means the memory is not deleted but MUST NOT imply variants are ready or deferred readers are implemented. Creator attribution MUST NOT independently grant access.

#### Scenario: Memory lifecycle data is stored
- **WHEN** a memory belongs to an existing space and valid creator membership
- **THEN** its content, ownership, lifecycle fields, and creation identity remain persistently addressable

#### Scenario: Creator is not an authorization authority
- **WHEN** the creator no longer has available membership and requests an operation
- **THEN** creator attribution alone does not authorize access

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

New creation photo objects SHALL reside in a private Cloudflare R2 bucket. Staging keys SHALL use `staging/memories/{spaceId}/{uploadId}/original`; final originals and variants SHALL use `memories/{spaceId}/{uploadId}/...`. Upload capability MUST be authorized by authenticated available membership and limited to its staging key. Final writes MUST remain server-controlled and actual final bytes MUST be validated before attachment. Every intended final copy SHALL be durably attributed to an upload record before copying. Public access and client-side storage credentials MUST NOT be available. New read/download endpoints, storage cleanup, and R2 lifecycle rules SHALL be deferred.

Existing Supabase-backed readers SHALL retain their available-memory membership authorization. These legacy read guarantees MUST NOT imply R2 read support for newly created PostgreSQL memories.

#### Scenario: Available member reads a cover object
- **WHEN** an available member reads a legacy cover through the existing storage reader
- **THEN** that reader authorizes only the object belonging to an available memory in the member's available space

#### Scenario: Object belongs to an unavailable or other-space memory
- **WHEN** an existing reader receives a request for an object belonging to a deleted, unauthorized, or other-space memory
- **THEN** it returns no authorized object and exposes no parent-memory metadata

#### Scenario: Creation stages a prospective object
- **WHEN** an authenticated available member obtains a staging upload capability
- **THEN** it targets only the authorized staging key and an upload record exists before the client uploads

#### Scenario: Staged creation cannot complete
- **WHEN** an upload cannot commit a parent memory and asset records
- **THEN** its staging/final copies remain private and attributable without a cleanup-execution promise

#### Scenario: Staging URL is reused after promotion
- **WHEN** the client writes staging again after the final copy is accepted
- **THEN** the accepted final original and worker input do not change

### Requirement: Resolve private cover previews on the server

The system SHALL expose a same-origin cover-photo media URL only after a server-side resolver establishes
that the requested memory is available to the authenticated requester. Every request to that media URL MUST
reauthorize the parent memory before returning bytes, MUST use server-owned persisted object metadata, and
MUST NOT expose or accept an object path, redirect, signed Storage credential, or client-supplied identity as
authority. Missing, deleted, other-space, and unauthorized memories MUST return the same generic unavailable
outcome, and media URLs MUST NOT be persisted as memory metadata.

#### Scenario: Authorized memory receives a preview URL

- GIVEN an authenticated user resolves an available memory with a cover photo
- WHEN the server resolves its cover preview
- THEN it returns an opaque same-origin media URL whose requests reauthorize that memory before returning
  photo bytes

#### Scenario: Unavailable memory requests a preview URL

- GIVEN a request targets a missing, deleted, other-space, or unauthorized memory
- WHEN the server resolves its cover preview
- THEN it returns the generic unavailable outcome without returning photo bytes, Storage credentials, or
  object metadata

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

The system SHALL use UUID identifiers for spaces, memberships, file uploads, memories, memory assets, object metadata, and outbox events. User references MUST retain the existing API authentication identity type rather than introduce a new user identity mapping for creation. Generic outbox aggregate IDs SHALL be capable of representing non-UUID identifiers. Supabase RPC identifier contracts SHALL NOT govern the new API creation endpoints.

#### Scenario: RPC receives a memory identifier
- **WHEN** an unchanged legacy memory reader calls a Supabase lookup RPC
- **THEN** that RPC continues to accept and return UUID-string memory identifiers without imposing its user identity contract on the new API

#### Scenario: API receives memory-domain identifiers
- **WHEN** upload or memory creation receives upload, cover, or idempotency identifiers
- **THEN** those identifiers are validated as UUID strings while the user identity is derived from the existing authenticated session

### Requirement: Memory assets exclude staging lifecycle

`memory_assets` SHALL reference exactly one committed memory and a deterministic nonnegative position. `memory_asset_objects` SHALL represent only final originals and their variants, with one object per asset/variant pair and unique final paths. Upload issuance, promotion attempts, and unattached objects MUST be represented by `file_uploads`, not by nullable-memory staging assets. Asset-space and cover-memory integrity MUST be enforced.

#### Scenario: Upload is issued without a memory
- **WHEN** an upload record is created or an original is promoted before memory commit
- **THEN** no committed memory asset or memory asset object exists solely to represent that staging/finalization attempt

#### Scenario: Memory commits accepted images
- **WHEN** the memory transaction attaches uploads
- **THEN** every asset references that memory and its consumed upload, has a unique position, and owns an original plus pending cover/detail metadata
