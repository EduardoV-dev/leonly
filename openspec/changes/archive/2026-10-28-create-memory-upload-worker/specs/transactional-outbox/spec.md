## Purpose

Persist downstream work atomically with business creation, preserving stable event identity and publication evidence for future recovery of unsent events.

## ADDED Requirements

### Requirement: Atomic generic event persistence

The system SHALL persist `outbox_event` with event identity, aggregate type/ID, event type, payload schema version, payload, creation timestamp, and publication bookkeeping. Memory creation MUST insert one image-generation event per attached image in its business transaction. Events MUST NOT reference expiring upload URLs. A memory without images SHALL require no image-generation events.

#### Scenario: Image memory commits
- **WHEN** creation commits with multiple images
- **THEN** every committed image has its generation event and upload consumption committed with the memory and asset records

#### Scenario: Event insertion fails
- **WHEN** any required outbox insertion fails
- **THEN** memory, associations, object metadata, and upload consumption roll back together

### Requirement: Publication follows commit and preserves success

The system SHALL attempt publication only after successful commit, preserve the persisted event ID in the message, and set `published_at` only after broker acknowledgment. Attempts and sanitized failure information SHALL be recorded. Publication failure MUST NOT turn a committed memory into a failed creation response. Published status MUST NOT imply image-generation completion.

#### Scenario: SQS rejects publication
- **WHEN** a committed event cannot be sent
- **THEN** creation still succeeds and the event remains unpublished with diagnostic information

#### Scenario: Only some image events publish
- **WHEN** a memory's events have mixed publication outcomes
- **THEN** successful acknowledgments are tracked individually and unsent events remain durable for future recovery

#### Scenario: Broker accepts before bookkeeping fails
- **WHEN** SQS accepts an event but publication bookkeeping fails or the process crashes
- **THEN** the event retains its identity for a later publication attempt without requiring a new memory or new event, and the worker tolerates duplicate delivery

### Requirement: Durable unpublished events and intentional reconciliation gap

The system SHALL retain unpublished events with their existing identities and publication contract. The shared publishing function SHALL bound event selection and preserve per-event outcomes on repeated invocation. An operator replay CLI and automatic outbox reconciliation SHALL remain deferred; this delivery MUST NOT claim a supported operator invocation or guaranteed eventual publication. Aggregate grouping MUST NOT be represented as a guarantee of strict queue ordering.

#### Scenario: Publishing function is invoked repeatedly
- **WHEN** the shared publishing function receives a bounded selection of unpublished events
- **THEN** it uses existing event identities and updates per-event outcomes without creating duplicate business records

#### Scenario: Process stops before sending
- **WHEN** creation commits but publication never occurs
- **THEN** the event remains durable for a future recovery mechanism and variants may remain pending indefinitely because neither an operator CLI nor an automatic-publication guarantee ships
