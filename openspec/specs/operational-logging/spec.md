# operational-logging Specification

## Purpose
Provide safe, bounded, structured application diagnostics for API services and background
processing so operators can investigate failures without reproducing them.

## Requirements

### Requirement: Correlated application identity
Application logs SHALL identify the service and deployment environment through the shared logger
configuration. The environment label SHALL fall back to the runtime environment so local runs work
without configuration. Production logs SHALL be structured JSON and development logs SHALL remain
readable.

#### Scenario: Application starts with valid configuration
- **WHEN** the API or worker starts
- **THEN** emitted records contain the configured service and environment identity and honor the
  default minimum severity

### Requirement: Diagnostic privacy and size bounds
Logs MUST exclude credentials, cookies, OAuth codes, session objects, sensitive query values,
personal content, and request bodies. Error causes SHALL be sanitized recursively. Strings, stacks,
collections, cause depth, and serialized error size SHALL have finite bounds; truncation MUST NOT
throw on hostile input.

#### Scenario: Error contains sensitive or pathological data
- **WHEN** an error contains nested secrets, personal content, URL credentials/query/fragment data,
  cycles, oversized values, or unsafe properties
- **THEN** serialization safely omits or redacts prohibited data, bounds the record, and preserves
  safe error classification

### Requirement: Explicit operational event ownership
Owning services SHALL record meaningful publication, recovery, dependency, and cleanup failures
using stable event names, outcomes, relevant safe identifiers, and sanitized `err` evidence.
Propagation alone MUST NOT create another log at every rethrowing layer. Logging MUST NOT change
committed business results or add a recovery mechanism.

#### Scenario: Queue acknowledgment precedes bookkeeping failure
- **WHEN** publication is accepted but publication bookkeeping fails
- **THEN** diagnostics identify the event, acknowledged publication, and separate bookkeeping
  failure without logging the message payload
- **AND** the committed business result and existing uncertain-publication semantics remain intact

#### Scenario: Existing recovery operation fails
- **WHEN** an existing recovery path fails
- **THEN** its owner records a correlated, sanitized operational failure without adding automatic
  reconciliation

### Requirement: Failed dependency probes are diagnosable
Failed health probes SHALL record dependency name, duration, timeout classification, and sanitized
cause. Failure and timeout outcomes SHALL be distinguishable. Successful dependency probes SHALL
emit no diagnostic records.

#### Scenario: Dependency throws or times out
- **WHEN** a dependency rejects its probe or exceeds the configured probe timeout
- **THEN** a diagnostic distinguishes rejection from timeout with dependency and duration

#### Scenario: All dependencies pass a health probe
- **WHEN** all dependencies pass a health probe
- **THEN** no probe-success diagnostic is emitted

### Requirement: Authentication provider diagnostics are safe
Authentication-provider diagnostics SHALL use the shared structured logger and sanitizer with
approved message classifications. Raw authentication arguments, sessions, callback URLs, or
credentials MUST NOT be forwarded to logs.

#### Scenario: Provider reports a callback failure
- **WHEN** an authentication diagnostic contains a hostile callback URL, OAuth code, or session
  object
- **THEN** the record retains a safe failure classification and sanitized detail without those
  sensitive values

### Requirement: Worker failures preserve original causes
Translated worker errors SHALL preserve their original cause. Processing, bookkeeping, and
lease-release failures SHALL be reported separately under sanitized `err` fields with relevant safe
identifiers.

#### Scenario: Processing and failure handling both fail
- **WHEN** image processing fails and failure bookkeeping also fails
- **THEN** diagnostics retain the original processing cause and a separate secondary failure

### Requirement: Worker record outcomes remain explicit
Record diagnostics SHALL include message ID, validated event/file IDs when available, receive count
when present, duration, and outcome. Retry exhaustion SHALL remain distinguishable from retryable
processing failures, preserving existing lease, ready-output, idempotency, and dead-letter
guarantees.

#### Scenario: A batch contains malformed and valid records
- **WHEN** one queue record is malformed and another contains a valid image event
- **THEN** each has its own message, receive-count, duration, and outcome diagnostics without
  logging raw bodies

#### Scenario: Retry budget is exhausted
- **WHEN** a failed record reaches the existing receive-count limit
- **THEN** diagnostics distinguish exhaustion and exhaustion-bookkeeping failure from an ordinary
  retry
- **AND** the existing failure-state and dead-letter policy remains effective

### Requirement: Operational documentation
Operational documentation SHALL define identity fields, event names, sanitization bounds, and
investigation queries matching the implemented records.

#### Scenario: Operator investigates failures
- **WHEN** an operator opens the operations runbook
- **THEN** documented fields and queries match the implemented records
