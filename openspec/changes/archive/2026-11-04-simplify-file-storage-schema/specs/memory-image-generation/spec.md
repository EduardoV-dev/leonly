## REMOVED Requirements

### Requirement: Asynchronous versioned image generation

**Reason**: A single maintained recipe and unified file rows replace versioned asset/object persistence and recipe-version payloads.

**Migration**: Adapt producer and worker together to the added asynchronous file-variant requirement. Reconcile incompatible queued events before enabling the new consumer; preserve validation and immutable writes.

## MODIFIED Requirements

### Requirement: Existing variant recipe and readiness

The worker SHALL preserve auto-orientation, the 40-million-pixel decoding bound, aspect-preserving resize without enlargement, WebP quality 85 for cover/detail, and their 1024/1600 bounds. It SHALL also convert validated uploaded originals to full-resolution WebP quality 90 under a different key and swap the original's reference while preserving its file ID and associations. It MUST generate all requested outputs from the validated source buffer and bound generated objects to the existing 10 MiB output limit. Each file MUST become ready only after its object and output metadata are verified. Original readiness SHALL be independent of derivative completion.

#### Scenario: Both output uploads succeed
- **WHEN** requested cover and detail outputs are generated and verified
- **THEN** their file rows are ready with object key, MIME type, and byte size without a bucket, readiness timestamp, or recipe-version column

#### Scenario: Only one variant is persisted
- **WHEN** processing fails after one requested output becomes ready
- **THEN** the ready output remains usable and a retry resumes only incomplete requested work

#### Scenario: Only a subset is requested
- **WHEN** an authorized event requests one supported variant and other possible variants do not exist
- **THEN** completing that requested output does not require creating unrelated variant rows

### Requirement: Duplicate and interrupted processing is recoverable

Repeated delivery SHALL NOT duplicate original/variant pairs or overwrite accepted objects. The worker MUST coordinate per-file execution with expiring operation locks and verify existing objects after interrupted writes. Ready outputs SHALL be skipped. Stale executions MUST NOT commit readiness after ownership changes or after the root/derivative becomes deleting; no processing state is required.

#### Scenario: Completed event is redelivered
- **WHEN** all requested variants already exist and are ready under the maintained recipe
- **THEN** redelivery acknowledges success without duplicate records or object replacement

#### Scenario: Worker crashes while processing
- **WHEN** an execution stops while holding operation ownership
- **THEN** a later delivery can recover after expiry without leaving a processing lifecycle state stuck

#### Scenario: Object exists before ready bookkeeping
- **WHEN** a retry finds a derivative object written by an interrupted attempt
- **THEN** it verifies the existing object before marking the same derivative row ready

#### Scenario: Another execution owns the derivative
- **WHEN** a stale attempt writes database completion after its ownership expires or is replaced
- **THEN** completion is rejected and cannot change deleting or newer-owned records

### Requirement: Retry isolation and dead-letter evidence

Failed queue records SHALL be reported individually while successful records are acknowledged. Transient backend/worker failures MUST remain retryable without prematurely marking files failed. Permanent failures or exhausted retry budgets SHALL produce diagnosable failure state for affected eligible files. Repeatedly unsuccessful messages MUST reach a dead-letter queue with event/file identity.

#### Scenario: Batch contains a failed record
- **WHEN** one record fails while another succeeds
- **THEN** only failed records are requested for redelivery and successful files retain their state

#### Scenario: Retries are exhausted
- **WHEN** an event exceeds the bounded receive/retry policy
- **THEN** it reaches the dead-letter queue and affected eligible unfinished files are marked failed through the bounded failure-handling path
- **AND** already-ready or deleting files are not downgraded

#### Scenario: Temporary storage failure occurs
- **WHEN** generation encounters a retryable storage error with retry budget remaining
- **THEN** the unfinished file stays pending or uploaded with an error code, rather than becoming terminally failed

## ADDED Requirements

### Requirement: Asynchronous file-variant generation

A queued worker SHALL validate and replace attached uploaded originals, then generate requested variants using one maintained recipe. It MUST authorize event identity, attachment, space, root eligibility, and source/replacement keys before storage access. Derivatives MUST inherit root attribution and purpose within the same space. Memory creation MUST NOT decode or generate images synchronously.

#### Scenario: Image event is valid
- **WHEN** an event identifies an eligible attached original and requested supported variants
- **THEN** the worker resolves its recorded storage location and creates or resumes the corresponding derivative files

#### Scenario: Event is malformed or unsupported
- **WHEN** an event has invalid identity, unsupported variant names, an unsupported transport contract, or mismatched context
- **THEN** no arbitrary object is processed and a sanitized diagnosable error is recorded

#### Scenario: Original or memory is no longer eligible
- **WHEN** a valid event references missing, deleting, detached, or unavailable retained context
- **THEN** the worker acknowledges an unavailable no-op without creating orphan derivative rows

#### Scenario: Root has deletion intent before derivative creation
- **WHEN** a generation request encounters an original marked deleting
- **THEN** root eligibility checks prevent that family from gaining a new derivative
