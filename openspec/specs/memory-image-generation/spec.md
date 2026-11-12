# memory-image-generation Specification

## Purpose
Generate memory image files asynchronously through duplicate-safe queued processing, with per-file readiness, failure evidence, and recoverable execution.

## Requirements

### Requirement: Existing variant recipe and readiness

The worker SHALL validate uploaded originals and generate requested derivatives with the maintained
recipe. It MUST preserve per-file readiness and verified outputs; original readiness MUST NOT wait
for unrelated derivatives.

#### Scenario: Original is prepared
- **WHEN** an uploaded original passes binary and image-decoding checks
- **THEN** the worker respects the 40-million-pixel decoding bound, writes full-resolution auto-oriented WebP at quality 90 under a different key, and swaps the reference without changing the file ID or associations

#### Scenario: Requested derivatives are generated
- **WHEN** an event requests cover or detail output
- **THEN** the worker uses the validated source buffer, preserves aspect ratio without enlargement, applies quality 85 and the 1024/1600 dimension bounds, and verifies each object and its metadata before marking that file ready; each output is at most 10 MiB

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

### Requirement: Asynchronous file-variant generation

Queued processing SHALL validate and replace originals and generate requested variants for authorized
committed attachments from creation or editing. Before storage access it MUST verify event, space,
root, available parent attachment, and recorded keys. Derivatives SHALL inherit root attribution.
Detached originals MUST NOT be processed. Neither creation nor edit Save SHALL decode or generate
images synchronously. Editing SHALL reuse the deployed creation event shape and existing recipe,
leases, immutable outputs, retry limits, and dead-letter handling without edit-attempt context.

#### Scenario: Image event is valid
- **WHEN** an event identifies an eligible attached original and supported requested variants
- **THEN** processing resolves recorded locations and creates or resumes the same derivative identities

#### Scenario: Event is malformed or unsupported
- **WHEN** event identity, variant names, transport shape, or context is invalid
- **THEN** no arbitrary location is processed and a sanitized diagnostic is recorded

#### Scenario: Original or memory is no longer eligible
- **WHEN** an event references a missing, deleting, unavailable, or detached original
- **THEN** processing acknowledges an unavailable no-op without creating orphan derivatives

#### Scenario: Root has deletion intent before derivative creation
- **WHEN** an event encounters a deleting original
- **THEN** eligibility checks prevent new active derivatives in that file family

#### Scenario: Newly added edit photo is queued
- **WHEN** a committed edit attaches a new original and publishes its existing-shape event
- **THEN** the worker processes that attachment as it does a creation attachment without another memory save or finalization

### Requirement: Edit additions do not reprocess retained photos

An edit SHALL enqueue image work only for newly added attachments. Retained files MUST NOT be
rewritten, downgraded, or scheduled for regeneration solely because the memory was edited. A missing
retained variant SHALL keep its existing nullable-preview behavior. New-photo readiness or failure
MUST NOT alter retained photos, saved metadata, or the committed removal selection. Workers MUST NOT
apply editor metadata, perform delayed swaps, or restore removed attachments.

#### Scenario: Retained photo is already ready
- **WHEN** an edit retains ready A and attaches pending D
- **THEN** only D receives new image work and A remains normally readable

#### Scenario: Delivery is duplicated or interrupted
- **WHEN** a new edit attachment's event is redelivered after partial processing
- **THEN** existing file identities and verified ready outputs are reused under existing processing leases

#### Scenario: New original is permanently invalid
- **WHEN** actual size, binary format, or decoding rejects a newly attached original
- **THEN** safe file failure evidence and unavailable previews affect that photo without rolling back the committed edit

#### Scenario: New derivative exhausts retries
- **WHEN** a required derivative exhausts the existing retry budget
- **THEN** existing failure/dead-letter handling preserves attribution and independent ready outputs without changing retained photos

### Requirement: Edit removal cannot revive processing files

Before publishing file metadata, workers SHALL recheck owned leases and effective root/parent
eligibility. A detached or deleting family MUST NOT regain active readiness from an in-flight or
duplicate delivery. Preserve durable attribution for external writes that finish after removal.

#### Scenario: Photo is removed during processing
- **WHEN** Save detaches and retires a photo while its worker is generating or writing output
- **THEN** later metadata publication cannot revive the removed family and any output remains attributed

#### Scenario: Parent is deleted during processing
- **WHEN** bodyless cascading deletion makes the parent and file family unavailable
- **THEN** processing does not republish serving readiness or change the committed deletion
