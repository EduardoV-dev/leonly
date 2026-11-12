## MODIFIED Requirements

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

## ADDED Requirements

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
