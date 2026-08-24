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

The system SHALL make a new memory available only after its metadata and every selected private
photo have been persisted successfully. A storage upload or persistence failure MUST leave no
available memory or accessible newly uploaded photo. The system MUST remove newly uploaded objects
for a recoverable failure and MUST track incomplete uploads for server-side cleanup after an
interrupted request.

#### Scenario: Every selected photo and metadata record succeeds

- **WHEN** valid creation completes all private uploads and persistence
- **THEN** the member's new memory is available with its selected cover and ordered photos

#### Scenario: Upload or persistence fails

- **WHEN** any selected photo upload or final metadata persistence fails
- **THEN** no available memory is returned, newly uploaded objects are inaccessible and scheduled
  for removal, and the member receives a retryable failure

#### Scenario: Request is interrupted during upload

- **WHEN** a creation request ends unexpectedly after an upload has begun but before completion
- **THEN** incomplete media remains inaccessible and server-side cleanup removes it without making
  a memory available

### Requirement: Idempotent creation and lost-response recovery

The client SHALL generate one UUID idempotency key for a creation form attempt and retain it while
retrying unchanged valid input after an uncertain result. The system MUST ensure that concurrent or
repeated requests with the same authenticated member and key create at most one memory. Once a
request completes, a retry with its original key SHALL return that same memory outcome; a key reused
with different normalized details or photos MUST be rejected without creating another memory.

#### Scenario: Member retries after losing a successful response

- **WHEN** a completed request's client does not receive its success response and retries with the
  same key and unchanged input
- **THEN** the system returns the originally created memory without creating a duplicate

#### Scenario: Duplicate request is pending

- **WHEN** another request uses the same authenticated member and key while the first is still
  processing
- **THEN** the system starts no second creation workflow and returns a retryable in-progress outcome

#### Scenario: Key is reused for different input

- **WHEN** a member submits a previously used idempotency key with different normalized details or
  photos
- **THEN** the system rejects the request without changing the original result or creating a memory

### Requirement: Create-memory feedback and success navigation

The system SHALL provide accessible client-side validation feedback, server field feedback,
single-flight submission, upload progress, and recoverable submission failure feedback while
retaining valid form input for retry. After successful timeline or Vault creation, it SHALL navigate
the member to the timeline route. Timeline creation SHALL become eligible for the next timeline
refresh; Vault creation MUST remain excluded from the timeline.

#### Scenario: Member repeats activation while submitting

- **WHEN** a member activates the create control repeatedly while a request is pending
- **THEN** the interface starts one request and communicates pending progress

#### Scenario: Recoverable submission failure occurs

- **WHEN** a valid submission cannot complete because of a recoverable upload or persistence failure
- **THEN** the interface preserves valid values and selected files, presents an accessible retry path,
  and uses the same idempotency key for that retry

#### Scenario: Creation succeeds in either placement

- **WHEN** a timeline or Vault memory is created successfully
- **THEN** the interface navigates to the timeline route, and only the timeline memory is eligible
  for the timeline
