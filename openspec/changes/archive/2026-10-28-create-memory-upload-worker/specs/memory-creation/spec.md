## ADDED Requirements

### Requirement: JSON creation references durable uploads

The API SHALL accept `POST /api/memories` as JSON memory details, ordered upload IDs, selected cover upload ID, and UUID idempotency key. It MUST resolve identity and active space from authentication and accept only eligible uploads authorized for memory images. Successful creation SHALL return the committed memory identifier and visibility through the standard API response contract without requiring a new read endpoint.

#### Scenario: Valid uploaded files are submitted
- **WHEN** an available member supplies valid details, eligible upload IDs, and cover selection
- **THEN** the API creates ordered committed assets from validated final originals and returns the memory identifier and visibility

#### Scenario: Upload reference is not eligible
- **WHEN** a request references a missing, expired, foreign-owned, other-space, or differently purposed upload
- **THEN** no memory is committed and the response does not expose another uploader's metadata

## MODIFIED Requirements

### Requirement: Complete creation or inaccessible cleanup

The system SHALL complete creation after validated final originals and a transaction containing memory metadata, ordered assets, object records, upload consumption, and image-generation events have persisted successfully. Cover/detail generation and SQS acknowledgment MUST NOT be prerequisites for creation success. Staged objects and unconsumed final copies MUST remain private and attributable to upload records. Cleanup SHALL be deferred; creation failures MUST NOT promise scheduled removal or configure automatic storage deletion.

#### Scenario: Every selected photo and metadata record succeeds
- **WHEN** all final originals validate and the creation transaction commits
- **THEN** creation succeeds with pending variants even if publication has not succeeded

#### Scenario: Upload or persistence fails
- **WHEN** promotion, validation, or final database persistence fails
- **THEN** no new committed memory is returned and any promoted objects remain private and tracked for retry or future cleanup

#### Scenario: Request is interrupted during upload
- **WHEN** a creation attempt stops after upload issuance or promotion but before commit
- **THEN** upload records preserve storage attribution without making staged files committed memory assets or claiming automatic deletion

### Requirement: Idempotent creation and lost-response recovery

The client SHALL generate one UUID idempotency key per intended creation and retain it for unchanged retries. PostgreSQL SHALL persist `idempotency_key` and immutable `creation_request_hash` on the memory and enforce uniqueness by authenticated creator user, owning space, and key. Equal-key/equal-hash retries SHALL return the committed memory outcome without new assets or events; equal-key/different-hash requests MUST return 409. Redis MUST NOT be required for creation idempotency. Successful retry resolution MUST precede rejection of that creation's already-consumed uploads.

#### Scenario: Member retries after losing a successful response
- **WHEN** a committed creation is retried with the same scoped key and unchanged normalized input
- **THEN** the API returns the existing memory identifier and visibility without duplicate assets or events

#### Scenario: Duplicate request is pending
- **WHEN** matching requests overlap before a result commits
- **THEN** at most one creation commits and a contender receives the same committed result or a retryable in-progress outcome

#### Scenario: Key is reused for different input
- **WHEN** the same scoped key is submitted with different normalized details, ordered uploads, or cover selection
- **THEN** the system returns 409 without changing the original memory or creating another

### Requirement: Create-memory feedback and success navigation

The creation interface SHALL preserve accessible validation and server-field feedback, single-flight submission, upload progress, and recoverable failure feedback. It MUST retain prepared upload IDs and the key for unchanged retries, and allocate a new key for changed input. Success feedback SHALL follow committed API creation rather than variant readiness. Existing navigation can remain, but displaying new records through timeline/Vault reads and original-image fallback SHALL be deferred in this delivery; Vault visibility MUST still be persisted correctly.

#### Scenario: Member repeats activation while submitting
- **WHEN** the member activates creation repeatedly while pending
- **THEN** the interface starts one submission and communicates progress

#### Scenario: Recoverable submission failure occurs
- **WHEN** an unchanged request has an uncertain upload or creation result
- **THEN** the interface preserves valid input, prepared uploads, and its idempotency key for retry

#### Scenario: Creation succeeds in either placement
- **WHEN** timeline or Vault creation commits with variants still pending
- **THEN** the interface reports successful creation without waiting for generation or promising visibility through deferred readers
