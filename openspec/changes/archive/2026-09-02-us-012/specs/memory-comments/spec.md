## ADDED Requirements

### Requirement: Soft-deleted comments remain absent from product reads
The system SHALL exclude soft-deleted comments from comment pages and all derived comment counts.
An authorized member who refreshes comment history after any local comment deletion MUST receive a
history reconciled to the active-comment dataset without duplicate, stale, or skipped active comments.

#### Scenario: History is refreshed after a local deletion
- **WHEN** an authorized member refreshes comment history after a successful local deletion
- **THEN** the deleted comment is absent and the returned active-comment order and count are current

#### Scenario: Cursor anchor was deleted
- **WHEN** a comment page request uses a cursor whose anchor was soft-deleted
- **THEN** the system returns the current first page marked as a cursor reset without exposing why the
  anchor is unavailable
