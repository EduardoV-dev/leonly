## MODIFIED Requirements

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
- **WHEN** the same scoped key is submitted with different details, ordered file references, or cover selection
- **THEN** the system returns 409 without altering the committed memory or creating another

### Requirement: JSON creation references durable uploads

The API SHALL retain `POST /api/memories` JSON details, ordered upload IDs, cover upload ID, and UUID idempotency key. Upload IDs SHALL resolve to root file IDs. Identity/space MUST come from authentication; only authorized memory-image originals can attach after presence confirmation. Success SHALL use the standard response envelope with memory ID and visibility. All memory read paths are outside this change and SHALL remain on their existing implementations until a separate change migrates them.

#### Scenario: Valid uploaded files are submitted
- **WHEN** an available member supplies valid details, eligible original file IDs, and cover selection
- **THEN** the API verifies originals, commits ordered same-space attachments, and returns the memory identifier and visibility

#### Scenario: Upload reference is not eligible
- **WHEN** a request references a missing, cleanup-claimed, foreign-owned, other-space, differently purposed, or otherwise unavailable file
- **THEN** no memory is committed and no other uploader's metadata is exposed

## ADDED Requirements

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
