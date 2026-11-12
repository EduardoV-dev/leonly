# transactional-outbox Specification

## Purpose
Persist downstream file-processing work atomically with business creation, preserving stable event identity and publication evidence for future recovery of unsent events.

## Requirements

### Requirement: Atomic generic event persistence

The system SHALL persist `outbox_events` with stable event ID, entity type/ID, event type, payload, creation time, and publication bookkeeping, without a schema-version column. Memory creation MUST insert one generation event per attached original in its business transaction. Events MUST NOT reference expiring upload URLs. Memories without images SHALL require no generation events.

#### Scenario: Image memory commits
- **WHEN** creation commits multiple image attachments
- **THEN** each original's generation event, ordered association, and selected cover commit atomically with the memory
- **AND** no consumed file status or separate asset/object metadata is required

#### Scenario: Event insertion fails
- **WHEN** any required outbox insertion fails
- **THEN** the memory, new attachments, cover selection, and events roll back together
- **AND** preexisting verified originals remain tracked without partial attachments

### Requirement: Publication follows commit and preserves success

Publication SHALL occur only after business commit and retain event identity in messages. The system MUST set `published_at` only after queue acknowledgment and record `publish_attempt_count` plus sanitized `last_publish_error_code`. Publication failure MUST NOT fail an already-committed creation. Queue acceptance SHALL NOT imply derivative readiness or worker completion.

#### Scenario: SQS rejects publication
- **WHEN** a committed event cannot be sent
- **THEN** creation still succeeds and the event remains unpublished with recorded attempt/error evidence

#### Scenario: Only some image events publish
- **WHEN** a memory's events have mixed publication outcomes
- **THEN** successful acknowledgments are tracked individually and unsent events remain durable

#### Scenario: Broker accepts before bookkeeping fails
- **WHEN** SQS accepts an event but bookkeeping fails or execution stops
- **THEN** the same event identity remains usable for replay and the worker tolerates duplicate delivery

### Requirement: Durable unpublished events and intentional reconciliation gap

The system SHALL retain unpublished events with their existing identities and publication contract. The shared publishing function SHALL bound event selection and preserve per-event outcomes on repeated invocation. An operator replay CLI and automatic outbox reconciliation SHALL remain deferred; this delivery MUST NOT claim a supported operator invocation or guaranteed eventual publication. Entity grouping MUST NOT be represented as a guarantee of strict queue ordering.

#### Scenario: Publishing function is invoked repeatedly
- **WHEN** the shared publishing function receives a bounded selection of unpublished events
- **THEN** it uses existing event identities and updates per-event outcomes without creating duplicate business records

#### Scenario: Process stops before sending
- **WHEN** creation commits but publication never occurs
- **THEN** the event remains durable for a future recovery mechanism and variants may remain pending indefinitely because neither an operator CLI nor an automatic-publication guarantee ships

### Requirement: Clear outbox fields and bounded pending selection

Outbox persistence SHALL use `id`, `entity_type`, `entity_id`, `event_type`, `payload`, `created_at`, `published_at`, `publish_attempt_count`, and `last_publish_error_code`. Attempts MUST be nonnegative. Unpublished selection SHALL remain bounded and deterministically ordered by creation time and ID, supported by a partial unpublished-event index. No additional publication-status column is required.

#### Scenario: Pending events are selected
- **WHEN** publication requests a bounded pending batch
- **THEN** only unpublished rows are selected in stable creation-time/ID order with their existing identities

#### Scenario: Renamed persistence is inspected
- **WHEN** the new outbox schema is deployed
- **THEN** aggregate/publication field aliases and the persisted schema-version column are absent from the new table definition

### Requirement: Producer and consumer contract remains coordinated

The producer, event parser, worker, and replay path MUST agree on file identity and entity naming after the schema change. Neither persistence nor transport SHALL contain a schema-version field, and parsers MUST NOT require or validate one. New generation events SHALL NOT require a recipe-version field. Incompatible old image messages MUST be drained, migrated, or quarantined before rollout.

#### Scenario: Publisher constructs a transport envelope
- **WHEN** it publishes a new row with no stored schema version
- **THEN** its envelope satisfies the deployed consumer contract without looking up a removed database column

#### Scenario: Legacy messages remain during rollout
- **WHEN** queued image messages still reference removed asset/upload fields or recipes
- **THEN** rollout reconciles them explicitly rather than processing arbitrary locations or repeatedly retrying an unknowingly incompatible contract

#### Scenario: Unrelated outbox work exists
- **WHEN** file metadata is reset for the approved migration
- **THEN** unrelated outbox rows and stable publication identities are preserved
