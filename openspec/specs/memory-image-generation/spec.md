# memory-image-generation Specification

## Purpose
Generate memory image variants independently of creation through duplicate-safe queued processing, with explicit readiness, failure evidence, and recoverable execution.

## Requirements

### Requirement: Asynchronous versioned image generation

An SQS-triggered AWS Lambda SHALL process `ImageVariantsRequested` events using immutable final originals and an explicit supported payload schema and generation recipe version. It MUST check authoritative asset metadata before accessing the event's storage reference. No variant generation SHALL run in the memory-creation request.

#### Scenario: Image event is valid
- **WHEN** an event identifies an eligible attached image and a supported contract
- **THEN** the worker generates its cover/detail variants from the final original rather than staging

#### Scenario: Event is malformed or unsupported
- **WHEN** an event has invalid fields, an unsupported version, or a mismatched original reference
- **THEN** the worker does not process arbitrary objects and records a diagnosable failure

#### Scenario: Asset is no longer eligible
- **WHEN** a valid event's asset or memory is missing or unavailable
- **THEN** the worker safely acknowledges a no-op without generating orphan variants for that event

### Requirement: Existing variant recipe and readiness

The initial worker SHALL preserve auto-orientation, a 40-million-pixel decoding bound, aspect-preserving resize without enlargement, WebP quality 85, and cover/detail maximum dimensions of 1024/1600. It MUST record ready references and verified output metadata only after corresponding objects exist. Generation SHALL be complete only when both required variants are ready for the requested recipe.

#### Scenario: Both output uploads succeed
- **WHEN** cover and detail are generated and persisted successfully
- **THEN** both object records are ready with content type, byte size, final key, and readiness timestamp

#### Scenario: Only one variant is persisted
- **WHEN** processing fails after one successful output
- **THEN** the image is not considered complete and a later attempt can resume incomplete work

### Requirement: Duplicate and interrupted processing is recoverable

Repeated publication or delivery MUST NOT create duplicate variant metadata or replace an accepted original. The worker SHALL coordinate overlapping processing and recover abandoned ownership. Stale processing attempts MUST NOT commit completion for newer ownership or recipe state.

#### Scenario: Completed event is redelivered
- **WHEN** both required variants are already ready for the same recipe
- **THEN** the worker acknowledges success without generating duplicate records

#### Scenario: Worker crashes while processing
- **WHEN** execution stops while holding processing ownership
- **THEN** a later delivery can recover after the ownership expires rather than leaving processing permanently stuck

### Requirement: Retry isolation and dead-letter evidence

Failed records SHALL be reported individually to the event source while successful records are acknowledged. Transient failures SHALL be retryable; failure codes SHALL distinguish permanent image/contract failures. Repeatedly unsuccessful events MUST reach a dead-letter queue under a bounded receive policy, with event and asset identifiers available for diagnosis.

#### Scenario: Batch contains a failed record
- **WHEN** one record fails while another succeeds
- **THEN** only failed records are requested for redelivery

#### Scenario: Retries are exhausted
- **WHEN** an event repeatedly fails beyond the configured receive bound
- **THEN** the message is retained in the dead-letter queue and affected image state does not claim completed generation
