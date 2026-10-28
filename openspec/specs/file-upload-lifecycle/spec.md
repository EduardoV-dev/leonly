# file-upload-lifecycle Specification

## Purpose
Track authorized file uploads before a consuming resource exists, and preserve attribution of staged and finalized objects across retries and interrupted creation.

## Requirements

### Requirement: Purpose-scoped upload issuance

The system SHALL expose `POST /api/files/uploads` for batch upload issuance and persist a `file_uploads` record before returning each upload capability. Initially it MUST accept only images for memory creation, with the existing JPEG/PNG/WebP and size/count limits. It SHALL derive uploader and active space from authentication, control object keys, and reject unsupported purposes. Future purposes MUST NOT change the existing image contract.

#### Scenario: Member requests image uploads
- **WHEN** an authenticated active member requests valid memory-image descriptors
- **THEN** the system returns stable upload IDs, required headers, and presigned PUT URLs scoped only to that member's authorized staging objects
- **AND** each returned upload has a durable ownership and lifecycle record

#### Scenario: Unsupported or unauthorized request
- **WHEN** a request uses an unsupported purpose, invalid descriptors, or unavailable membership
- **THEN** the system returns an appropriate validation or authorization failure without issuing unauthorized storage access

### Requirement: Staging capability expires independently of attachment

Presigned upload URLs MUST expire 10 minutes after issuance and target `staging/memories/{spaceId}/{uploadId}/original`. Upload records SHALL retain the latest issued expiry and a separate attachment deadline. Finalization MUST prevent subsequent URL renewal for that upload. No public access, final-key PUT capability, or storage credential SHALL be returned.

#### Scenario: Upload capability is issued
- **WHEN** the API issues a staging PUT URL
- **THEN** its expiry is 600 seconds after issuance and the response identifies required headers and expiry

#### Scenario: Upload URL expired but attachment remains eligible
- **WHEN** the original was uploaded and its signing expiry has passed but its attachment deadline has not
- **THEN** creation can finalize that upload without needing a new PUT URL

#### Scenario: Attachment deadline has passed
- **WHEN** an unconsumed upload is requested for attachment after its deadline
- **THEN** creation rejects the upload without consuming it or committing a memory

### Requirement: Recoverable immutable finalization

The system SHALL record the intended server-only final key before copying, coordinate finalization with recoverable ownership, and copy staging into `memories/{spaceId}/{uploadId}/original` without overwriting an existing final original. It MUST validate the actual final bytes before marking finalization successful. Staging changes after promotion MUST NOT change accepted originals. Interrupted attempts SHALL remain attributable and recoverable through upload records.

#### Scenario: Final copy is accepted
- **WHEN** an eligible staging image is copied and its final bytes pass format, size, and decoding checks
- **THEN** the upload records its verified metadata and becomes eligible for transactional consumption

#### Scenario: Staging is replaced around copying
- **WHEN** the client changes staging while an upload URL remains usable
- **THEN** the server validates the final copy that will be attached and subsequent staging writes cannot replace that copy

#### Scenario: Request stops after copy
- **WHEN** copying succeeds but the process stops before finalization bookkeeping or memory commit
- **THEN** the existing upload record identifies the final object and a later eligible attempt can recover without overwriting it

#### Scenario: Final bytes are invalid
- **WHEN** the finalized copy fails binary image validation
- **THEN** no memory consumes it and a corrected file requires a new upload identity rather than replacing the final object

### Requirement: Consumption is exclusive and atomic

An upload SHALL be consumed by at most one committed asset. Its consumed transition MUST share the consuming memory transaction. A stale finalization attempt MUST NOT consume an upload reclaimed by another attempt. Staging SHALL NOT be represented by `memory_assets` or `memory_asset_objects`.

#### Scenario: Two memories request the same upload
- **WHEN** distinct creation requests race to consume one upload
- **THEN** at most one commits that upload and the other receives a conflict or retryable in-progress outcome

#### Scenario: Creation transaction rolls back
- **WHEN** memory persistence fails after promotion
- **THEN** the upload remains unconsumed and its final key remains tracked without committed memory-asset metadata

### Requirement: Cleanup is deferred without losing attribution

This delivery MUST retain staging and unconsumed final objects without automatic deletion, and MUST NOT install R2 lifecycle rules, cleanup schedules, or staging-deletion events. Upload records SHALL retain sufficient identity, ownership, keys, state, and timestamps to support later recovery and cleanup decisions.

#### Scenario: Upload is abandoned
- **WHEN** upload issuance or finalization is not followed by successful memory creation
- **THEN** the upload remains tracked and this delivery makes no automatic-deletion guarantee
