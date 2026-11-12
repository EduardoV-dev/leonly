## MODIFIED Requirements

### Requirement: Legacy image endpoint boundary

Migrated Timeline, Vault, dashboard, detail, and editor previews SHALL use authorized signed storage
URLs from the current backend, not `/api/memories/:memoryId/photos/:photoId/:variant`. No replacement
application image proxy SHALL be introduced. Legacy routes SHALL remain only where independently
required by verified remaining consumers and MUST NOT be a fallback for migrated editor data.

#### Scenario: Migrated list or detail renders a cover
- **WHEN** a migrated list, dashboard, or detail renders an eligible ready photo
- **THEN** the browser requests its signed storage URL directly without a legacy or replacement image proxy

#### Scenario: Existing editor preview renders an image
- **WHEN** the migrated editor displays a retained photo
- **THEN** it uses the signed URL from its current-backend editor read, without querying Supabase

### Requirement: Shared optimistic-lock request field

The API SHALL accept exact `lastKnownUpdatedAt` on memory edits, placement, comment mutations, and
existing space-name, start-date, and display-name updates. Clients MUST send the last observed server
timestamp without truncation or conversion. Bodyless migrated memory deletion MUST NOT gain a
version precondition. Memory edits SHALL use this token without adding an edit idempotency key or
durable operation resource; creation's existing idempotency contract remains unchanged.

#### Scenario: Current timestamp is submitted
- **WHEN** an authorized update supplies the current `lastKnownUpdatedAt`
- **THEN** its atomic comparison succeeds and the response preserves its advanced canonical timestamp

#### Scenario: Stale timestamp is submitted
- **WHEN** an authorized update supplies a stale `lastKnownUpdatedAt` for an eligible resource
- **THEN** HTTP 409 leaves newer data unchanged

#### Scenario: Old or invalid field is submitted
- **WHEN** an update supplies an obsolete version field or invalid timestamp instead of `lastKnownUpdatedAt`
- **THEN** HTTP 400 rejects it without changing data

## ADDED Requirements

### Requirement: Read an active-space memory for editing

`GET /api/memories/:memoryId/edit` SHALL authorize either active member and return the standard
response envelope with editable metadata, visibility, cover file ID, exact `updatedAt`, and all
attached root photo IDs in persisted position order with nullable signed preview URLs. The read
SHALL use `Cache-Control: no-store` and current-backend records only, independent of current placement.

#### Scenario: Editor requests prefilled values
- **WHEN** either active member requests an available Timeline or Vault memory
- **THEN** HTTP 200 returns editable state without detail-only cover-first sorting or editable creator/social fields

#### Scenario: Attached photo has no preview
- **WHEN** an attached file has no ready preview variant
- **THEN** its photo ID remains in the ordered collection and its preview URL is null

### Requirement: Save a memory edit

`PATCH /api/memories/:memoryId` SHALL accept only `title`, `description`, `location`, `memoryDate`,
`timezone`, `visibility`, `lastKnownUpdatedAt`, `retainedPhotoIds`, ordered `uploadIds`, and nullable
`coverFileId`. Required empty selections mean retain/add none. The request MUST NOT accept an edit
idempotency key. Responses SHALL use the standard envelope and `Cache-Control: no-store`.

#### Scenario: Metadata-only edit completes
- **WHEN** a valid metadata-only edit matches the current timestamp
- **THEN** HTTP 200 returns the advanced persisted token after commit without creating image events

#### Scenario: Photo edit completes before processing
- **WHEN** a valid edit retains A/C, removes B, and attaches new D while D is not ready
- **THEN** HTTP 200 reports the committed save and fresh reads show A/C normally with a nullable preview for D and no B

#### Scenario: Repeated save uses an old timestamp
- **WHEN** a request repeats a timestamp already consumed by a committed edit
- **THEN** HTTP 409 prevents another mutation without promising replay of the original successful result

### Requirement: Memory edit save completion

HTTP 200 SHALL return `{ id, visibility, updatedAt }` after metadata, final ordered associations,
cover, removals/file retirement, and new-photo events commit together. New photos SHALL process
after attachment as in creation. Success MUST mean persistence, not image readiness or queue
acceptance. No edit-status resource, 202 preparation response, or finalize/resume request SHALL be added.

#### Scenario: Save transaction commits
- **WHEN** all required edit writes commit while new image variants are pending
- **THEN** HTTP 200 returns the persisted advanced token without waiting for a second finalization request

#### Scenario: Post-commit publication fails
- **WHEN** the edit commits but bounded queue publication fails or is uncertain
- **THEN** the saved edit is not reported as rolled back, outbox failure evidence remains, and no second save is required to finalize it

### Requirement: Memory edit failure boundaries

Editor APIs SHALL return 401 without a session and the same generic 404 for absent membership or
malformed, missing, inactive, deleted, cross-space, or inaccessible targets. Saves SHALL use 400 for
invalid input, 409 for eligible stale edits or conflicting upload claims, and safe 5xx for unexpected
pre-commit failures. Failures MUST use shared envelopes without partial edits or Supabase fallback.

#### Scenario: Input or reference is invalid
- **WHEN** fields, timezone, future date, count, cover, duplicates, timestamp precision, or foreign retained/new-upload references fail validation
- **THEN** HTTP 400 identifies applicable fields without revealing foreign data or changing the memory

#### Scenario: Edit loses a lifecycle race
- **WHEN** another edit or placement commits first, or deletion makes the parent unavailable
- **THEN** Save returns 409 for a still-accessible stale target or generic 404 for an unavailable target

#### Scenario: Pre-commit persistence fails
- **WHEN** the transaction fails before commit
- **THEN** the ordinary safe error envelope claims no success and all related memory, file-state, association, and event writes roll back

#### Scenario: Image processing fails after commit
- **WHEN** a newly attached photo later fails actual content checks or processing
- **THEN** the existing photo-read contract returns unavailable variants without changing the committed save or retained photos

#### Scenario: Save response is lost
- **WHEN** the client cannot determine whether a save committed
- **THEN** recovery reloads the authorized current memory without an attempt lookup, automatic stale-token replacement, or blind replay

### Requirement: Document memory editor operations

The local API reference SHALL document the editor snapshot and single save operation with shared
schemas, authentication, strict inputs, exact timestamps, ten-photo/cover/order rules, 200 committed
save semantics, asynchronous per-photo readiness, safe errors, uncertain-response reload, and signed
URL expiry. It SHALL explicitly distinguish retained, added, and removed photos and state that no
historical edit-result replay or durable operation resource is provided.

#### Scenario: Developer inspects editor contracts
- **WHEN** a developer opens OpenAPI or Scalar locally
- **THEN** both editor operations describe matching schemas and applicable 200, 400, 401, 404, 409, and server-error behavior without staged-edit endpoints
