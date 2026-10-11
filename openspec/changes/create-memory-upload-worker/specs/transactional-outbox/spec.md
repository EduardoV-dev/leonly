## Purpose

Persist downstream work atomically with business creation, preserving stable event identity and publication evidence while allowing manual recovery of unsent events.

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
- **THEN** successful acknowledgments are tracked individually and unsent events remain replayable

#### Scenario: Broker accepts before bookkeeping fails
- **WHEN** SQS accepts an event but publication bookkeeping fails or the process crashes
- **THEN** replay can publish the same event ID again without requiring a new memory or new event

### Requirement: Bounded manual replay and intentional reconciliation gap

The system SHALL provide operator-only bounded replay of unpublished events using their existing identities and publication contract. Automatic outbox reconciliation SHALL remain deferred. Aggregate grouping MUST NOT be represented as a guarantee of strict queue ordering.

#### Scenario: Operator retries unpublished work
- **WHEN** an operator selects unpublished events for replay
- **THEN** the system sends existing events and updates per-event publication outcomes without creating duplicate business records

#### Scenario: Process stops before sending
- **WHEN** creation commits but publication never occurs
- **THEN** the event remains durable for manual replay and no automatic-publication guarantee is claimed
