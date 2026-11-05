# Memory Creation Specification

## Purpose

Allow an available member to create one complete timeline or Vault memory with optional private
file attachments, while keeping identity, asynchronous media validation, and retry behavior trustworthy.

## Requirements

### Requirement: Active-space memory creation

The system SHALL allow an authenticated available member to create a memory only in that member's
active space. It MUST derive the owning space and creator from the authenticated membership and
MUST ignore any client-supplied space or creator identifier. A successful creation SHALL persist a
UUID memory with `deleted_at` null and the requested `timeline` or `vault` visibility.

#### Scenario: Available member creates a timeline memory

- **WHEN** an available member submits valid memory details with timeline placement
- **THEN** the system creates the memory in that member's active space with that member as creator
  and timeline visibility

#### Scenario: Payload supplies another identity or space

- **WHEN** a creation request includes a creator or space identifier that differs from the
  authenticated member's active membership
- **THEN** the system does not use the supplied identifier and creates no record outside the
  authenticated member's active space

#### Scenario: Requester has no available space

- **WHEN** an unauthenticated user or a user without an available active space submits creation
- **THEN** the system creates no memory or photo object and returns the generic unavailable outcome

### Requirement: Validated memory details and local date

The system SHALL require a title whose trimmed length is 1 through 120 characters and a real
date-only memory date. It SHALL accept an optional description with trimmed length at most 2,000
characters and optional location with trimmed length at most 150 characters. The request MUST
include an IANA timezone; the server MUST validate that timezone and derive its current local
calendar date independently. The memory date MUST NOT be after that derived date.

#### Scenario: Valid details are submitted

- **WHEN** a member submits a valid title, memory date, and valid IANA timezone with optional valid
  details
- **THEN** the system persists trimmed text values and the supplied date-only memory date

#### Scenario: Invalid detail or date is submitted

- **WHEN** title, description, location, memory date, or timezone is missing, malformed, invalid,
  or outside its allowed boundary
- **THEN** the system identifies the affected field and creates no memory or photo object

#### Scenario: Memory date is later than the member's local date

- **WHEN** a valid request supplies a date later than the server-derived calendar date in its valid
  submitted timezone
- **THEN** the system rejects the date without creating a memory or photo object

### Requirement: Ordered private files and cover selection

The system SHALL accept zero through 10 memory-image uploads, each no larger than 5 MB with JPEG,
PNG, or WebP declared content type. The worker MUST validate actual bytes asynchronously; metadata
alone MUST NOT establish readiness. Creation MUST require exactly one selected cover when files are
present and persist attachments in submission order. US-004 MUST NOT offer reordering of non-cover
files.

#### Scenario: Memory is created without files

- **WHEN** a member submits valid details with no files
- **THEN** the system creates the memory with no cover file or attachment

#### Scenario: Memory is created with uploaded files

- **WHEN** a member submits one through 10 presence-confirmed uploads and selects one as cover
- **THEN** the system persists file attachments in selection order and the selected file as cover

#### Scenario: File input or cover selection is invalid

- **WHEN** a request exceeds 10 files, includes an oversized or unsupported descriptor, or omits or
  mismatches the selected cover
- **THEN** the system rejects the affected input without committing a memory or accessible file
  object

#### Scenario: Uploaded bytes fail worker validation

- **WHEN** a worker later rejects an attached file's bytes
- **THEN** the file remains unavailable for serving and the committed memory is not removed

### Requirement: Complete creation or inaccessible cleanup

The system SHALL complete creation after HEAD presence confirmation and a transaction containing memory details, ordered uploaded `memory_files`, cover selection, and processing events commits. Original content validation, replacement, variant generation, and queue acknowledgment MUST NOT gate success. Unvalidated objects SHALL remain private and tracked in `files`; abandoned objects SHALL remain attributed while cleanup is deferred, without altering memory retention.

#### Scenario: Every selected photo and metadata record succeeds
- **WHEN** all selected originals are presence-confirmed and the creation transaction commits
- **THEN** creation succeeds even when requested variants or publication remain pending

#### Scenario: Upload or persistence fails
- **WHEN** immutable upload verification or final database persistence fails
- **THEN** no new committed memory is returned and objects remain private and tracked for eligible retry or cleanup

#### Scenario: Request is interrupted during upload
- **WHEN** creation stops after issuance or object arrival but before commit
- **THEN** file rows retain ownership and storage attribution without creating partial attachments
- **AND** file attribution remains available while abandonment cleanup is deferred

### Requirement: Idempotent creation and lost-response recovery

The client SHALL retain one UUID key for unchanged creation retries. PostgreSQL MUST enforce uniqueness by creator, space, and key, with an immutable normalized-request hash. Equal-key/equal-hash retries SHALL return the committed result without duplicate attachments/events; different input MUST return 409. Redis SHALL NOT be required. Existing-result lookup MUST precede rejection of files already attached by that creation.

#### Scenario: Member retries after losing a successful response
- **WHEN** a committed creation is retried with the same scoped key and unchanged normalized input
- **THEN** the API returns the original identifier and visibility without duplicate attachments or events

#### Scenario: Duplicate request is pending
- **WHEN** matching requests overlap before a result commits
- **THEN** at most one creation commits and a contender receives the same committed result or a retryable in-progress outcome

#### Scenario: Key is reused for different input
- **WHEN** the same scoped key is submitted with different normalized details, ordered uploads, or cover selection
- **THEN** the system returns 409 without altering the committed memory or creating another

### Requirement: Create-memory feedback and success navigation

The creation interface SHALL provide accessible validation, progress, and recoverable failure
feedback, and prevent concurrent submissions. It MUST retain upload IDs and the idempotency key for
unchanged retries, allocating a new key only when input changes. Success SHALL follow API commit, not
variant readiness. Timeline/Vault read visibility remains deferred; Vault visibility MUST persist.

#### Scenario: Member repeats activation while submitting
- **WHEN** the member activates creation repeatedly while pending
- **THEN** the interface starts one submission and communicates progress

#### Scenario: Recoverable submission failure occurs
- **WHEN** an unchanged request has an uncertain upload or creation result
- **THEN** the interface preserves valid input, prepared uploads, and its idempotency key for retry

#### Scenario: Creation succeeds in either placement
- **WHEN** timeline or Vault creation commits with variants still pending
- **THEN** the interface reports successful creation without waiting for generation or promising visibility through deferred readers

### Requirement: JSON creation references durable uploads

`POST /api/memories` SHALL accept JSON details, ordered root file IDs, cover file ID, and a UUID
idempotency key. Identity and space MUST come from authentication; only authorized memory-image
originals can attach after presence confirmation. Success uses the standard response envelope. Memory
read paths SHALL remain unchanged until a separate migration.

#### Scenario: Valid uploaded files are submitted
- **WHEN** an available member supplies valid details, eligible upload IDs, and cover selection
- **THEN** the API verifies originals, commits ordered same-space attachments, and returns the memory identifier and visibility

#### Scenario: Upload reference is not eligible
- **WHEN** a request references a missing, cleanup-claimed, foreign-owned, other-space, differently purposed, or otherwise unavailable file
- **THEN** no memory is committed and the response does not expose another uploader's metadata

### Requirement: Minimal database-enforced attachment ownership

`memory_files` SHALL contain only `memory_id`, `file_id`, `space_id`, and nonnegative `position`. PostgreSQL MUST enforce unique memory/file pairs, one attachment per file, unique positions per memory, and matching file/memory spaces through composite foreign keys. The service MUST permit new attachments only to uploaded or ready root originals, not derivatives or pending/deleting files.

#### Scenario: Cross-space attachment is attempted
- **WHEN** an association combines a memory and file from different spaces
- **THEN** PostgreSQL rejects it even if application validation is bypassed

#### Scenario: Duplicate file or gallery position is attempted
- **WHEN** a transaction attaches a file twice or reuses an occupied position in one memory
- **THEN** PostgreSQL rejects the conflicting association

#### Scenario: Derivative is submitted as an original attachment
- **WHEN** creation references a derivative or a file whose presence has not been confirmed
- **THEN** the service does not commit it as an attachment

### Requirement: Cover references an attached original

The memory SHALL use nullable `cover_file_id` instead of `cover_asset_id`. PostgreSQL MUST enforce `(memory.id, cover_file_id)` membership in `memory_files(memory_id, file_id)`. Creation SHALL retain existing exactly-one-cover behavior when photos exist. Derivatives SHALL remain associated with their original through `original_file_id` and `variant_name`; variant-specific cover columns SHALL NOT be added.

#### Scenario: Cover belongs to another memory
- **WHEN** a memory selects a file attached only to another memory
- **THEN** PostgreSQL rejects the cover reference

#### Scenario: Selected cover attachment is removed
- **WHEN** an authorized operation detaches the currently selected cover
- **THEN** the same transaction first clears or replaces the cover reference rather than leaving it dangling

#### Scenario: Memory has no photos
- **WHEN** valid creation contains no photos
- **THEN** no attachment is inserted and the cover reference remains null
