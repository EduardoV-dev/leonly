## ADDED Requirements

### Requirement: Edit image events commit with new attachments

Save SHALL atomically persist one existing-shape image-processing event for each newly added photo
with the memory changes and committed attachment. Events MUST identify stable attached root files,
parent memory, space, and requested variants, never expiring URLs or caller-selected storage paths.
Metadata-only, retained-only, removal-only, and cover-only edits MUST NOT enqueue retained-photo work.
There SHALL be no attempt/reservation context, new event version, or later edit-finalization event.

#### Scenario: Photo edit commits
- **WHEN** a version-matching edit attaches new originals
- **THEN** their events, final associations, cover, removals, and memory changes commit together before publication

#### Scenario: Event persistence fails
- **WHEN** a required new-photo event cannot be stored
- **THEN** the transaction rolls back all edit effects and prior memory/photo state remains current

#### Scenario: Edit only retains or removes photos
- **WHEN** Save contains no newly added original
- **THEN** no image-processing event is created for retained files

### Requirement: Edit publication follows committed save semantics

Publication SHALL follow commit through the existing bounded publisher. A committed save SHALL remain
successful despite publication failure, with stable event identities and safe failure evidence.
Duplicate delivery SHALL reuse existing attached-file processing. No automatic reconciler, edit-status
polling, resume endpoint, second save to finalize, or unattended eventual-processing guarantee SHALL be added.

#### Scenario: Queue rejects new-photo work
- **WHEN** publication fails after an edit commits
- **THEN** the edit remains saved, unpublished events retain failure evidence, and new photos may remain unavailable without harming retained photos

#### Scenario: Broker accepted before bookkeeping failed
- **WHEN** a committed edit's event is delivered again after uncertain publication bookkeeping
- **THEN** worker processing reuses existing file identities and verified outputs without repeating the memory edit

#### Scenario: Publication is never recovered
- **WHEN** a committed event stays unpublished under the existing publication policy
- **THEN** its photo can remain pending while committed metadata, explicit removals, and retained-photo access remain effective
