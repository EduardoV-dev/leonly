## ADDED Requirements

### Requirement: Memory deletion moves attached files to deleting

When a memory is soft-deleted, every file attached to it through its photo association and every derivative
of those files SHALL move to the `deleting` status within the deletion transaction. The transition MUST NOT
remove storage objects, delete file rows, or alter attribution. `deleting` remains a non-serving state, and
actual removal stays with the deferred cleanup capability.

#### Scenario: Deletion marks the attached original and its variants
- **WHEN** a memory's deletion commits
- **THEN** each attached original and derivative has status `deleting` and keeps its object key and attribution

#### Scenario: Deleting file cannot be revived
- **WHEN** a verification or generation operation holding an expired or stale lock attempts to write a `deleting` file
- **THEN** its database mutation is rejected and the file stays `deleting`

#### Scenario: Deleting file is not served
- **WHEN** a product read or API request resolves a `deleting` file
- **THEN** it returns no bytes, signed URL, or object key for that file

#### Scenario: Derivative publication races with deletion
- **WHEN** derivative publication and memory deletion overlap
- **THEN** publication committed first is included in the cascade, and publication resuming after deletion cannot introduce active derivatives or restore readiness

#### Scenario: Storage write is already in flight
- **WHEN** an image worker's storage write finishes after its parent memory is deleted
- **THEN** its output remains attributable for deferred cleanup and is not published as a serving file; database locks do not promise cancellation of storage I/O
