# Memory Creation Specification

## Purpose

Allow an available member to create one complete timeline or Vault memory with optional private
photos, while keeping identity, media validation, completion, and retry behavior trustworthy.

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

### Requirement: Verified ordered private photos and cover selection

The system SHALL accept zero through 10 photos. Each submitted photo MUST be no larger than 5 MB
and its binary content MUST be verified as JPEG, PNG, or WebP by the server; filename extension and
client-declared MIME type MUST NOT establish acceptance. When photos are present, the request MUST
select exactly one submitted photo as cover. The system SHALL persist all photos in submission
selection order with deterministic positions, and the selected photo as the memory cover. US-004
MUST NOT offer reordering of non-cover photos.

#### Scenario: Memory is created without photos

- **WHEN** a member submits valid details with no photos
- **THEN** the system creates the memory with no cover photo and no photo metadata

#### Scenario: Memory is created with valid photos

- **WHEN** a member submits one through 10 valid image files and selects one as cover
- **THEN** the system persists the photos in selection order and the selected photo as the cover

#### Scenario: Photo input is invalid

- **WHEN** a request exceeds 10 photos, includes an oversized file, has unsupported or
  misidentified binary content, or omits or mismatches the selected cover
- **THEN** the system rejects the affected input without creating a memory or accessible photo
  object

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

### Requirement: JSON creation references durable uploads

The API SHALL accept `POST /api/memories` as JSON memory details, ordered upload IDs, selected cover upload ID, and UUID idempotency key. It MUST resolve identity and active space from authentication and accept only eligible uploads authorized for memory images. Successful creation SHALL return the committed memory identifier and visibility through the standard API response contract without requiring a new read endpoint.

#### Scenario: Valid uploaded files are submitted
- **WHEN** an available member supplies valid details, eligible upload IDs, and cover selection
- **THEN** the API creates ordered committed assets from validated final originals and returns the memory identifier and visibility

#### Scenario: Upload reference is not eligible
- **WHEN** a request references a missing, expired, foreign-owned, other-space, or differently purposed upload
- **THEN** no memory is committed and the response does not expose another uploader's metadata
