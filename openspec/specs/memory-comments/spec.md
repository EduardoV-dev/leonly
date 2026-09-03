## Purpose

Enable active-space members to add and read trustworthy, private conversation context on an available
Timeline or shared Private Vault memory.

## Requirements

### Requirement: Authorized comments on available memories

The system SHALL allow an authenticated active member to read and create comments only for an active,
available Timeline or shared Private Vault memory in that member's active space. It MUST derive the
member, author, space, and memory access from the authenticated session and MUST NOT trust client-supplied
author or space identifiers. Malformed, missing, soft-deleted, inactive, cross-space, and inaccessible
memories MUST produce the same generic not-found outcome without exposing comments or record existence.

#### Scenario: Active member comments on a Timeline memory

- **WHEN** an active member submits a valid comment for an available Timeline memory in the active space
- **THEN** the system creates and returns the authorized comment

#### Scenario: Active member comments on a Vault memory

- **WHEN** an active member submits a valid comment for an available shared Private Vault memory in the
  active space
- **THEN** the system creates and returns the authorized comment without changing memory visibility

#### Scenario: Memory is unavailable

- **WHEN** a member requests or submits comments for a malformed, missing, soft-deleted, inactive,
  cross-space, or inaccessible memory
- **THEN** the system returns the same generic not-found outcome with no memory or comment information

#### Scenario: Membership is unavailable

- **WHEN** an unauthenticated user or inactive member requests or submits comments
- **THEN** the system creates no comment and exposes no comment history

### Requirement: Validated plain-text comment creation

The system SHALL accept comment text only when its trimmed value contains between 1 and 1,000 Unicode
characters inclusive. It MUST store and render the normalized value as plain text, preserve line breaks,
and MUST NOT interpret user content as HTML. Client validation MUST improve feedback but MUST NOT replace
server validation. Invalid submission MUST preserve the member's draft for correction.

#### Scenario: Valid comment is submitted

- **WHEN** a member submits text whose trimmed value is between 1 and 1,000 characters
- **THEN** the system stores the trimmed plain-text value and preserves intentional internal line breaks

#### Scenario: Comment is empty after trimming

- **WHEN** a member submits empty or whitespace-only text
- **THEN** the system rejects the submission, associates a required message with the composer, and
  preserves the draft

#### Scenario: Comment exceeds the limit

- **WHEN** a member submits text whose trimmed value exceeds 1,000 characters
- **THEN** the system rejects the submission, identifies the 1,000-character limit, and preserves the
  draft for editing

#### Scenario: Comment contains markup-like content

- **WHEN** a valid comment contains HTML or script-like characters
- **THEN** the system displays those characters as inert plain text

### Requirement: Current author attribution and server timestamp

Each returned comment SHALL identify its author by the current display name of that author's membership
in the memory's space and SHALL include its server-assigned creation timestamp. The system MUST NOT accept
a display name or creation timestamp from the submission as authoritative.

#### Scenario: Comment is created successfully

- **WHEN** the server accepts a comment
- **THEN** the returned comment shows the authenticated author's current membership display name and
  server-assigned creation timestamp

#### Scenario: Member display name changes

- **WHEN** an authorized comment history is read after its author's membership display name changes
- **THEN** existing comments show the current membership display name

### Requirement: Deterministic bounded comment history

The system SHALL return comments in pages of at most 20 active records, ordered by creation timestamp
descending and then comment UUID descending. Pagination MUST use an opaque, versioned cursor containing
the full timestamp and UUID ordering tuple. Soft-deleted comments MUST be excluded from pages and any
derived counts. Initial and subsequent pages MUST contain no duplicate or skipped active comment for an
unchanged ordered dataset.

#### Scenario: First comment page is requested

- **WHEN** an authorized member opens a memory with more than 20 active comments
- **THEN** the system returns the newest 20 comments in deterministic order and a next cursor

#### Scenario: Next comment page is requested

- **WHEN** an authorized member requests the next page with a current valid cursor
- **THEN** the system returns the next distinct comments after the full cursor tuple in deterministic
  order

#### Scenario: Final page is reached

- **WHEN** a returned page has no additional active comments
- **THEN** the system returns no next cursor and the interface offers no load-more action

#### Scenario: Comment is soft-deleted

- **WHEN** a comment has a deletion timestamp
- **THEN** the comment is absent from comment pages and derived counts

### Requirement: Safe invalid and stale cursor recovery

The system SHALL treat malformed, unsupported-version, mismatched, or no-longer-current cursors as a
recoverable refresh. It MUST return the current first page with a cursor-reset indication rather than an
error or results based on an untrusted cursor. The client MUST replace accumulated pages with that first
page and MUST NOT append it to stale results.

#### Scenario: Cursor cannot be decoded

- **WHEN** a comment page request contains a malformed or unsupported cursor
- **THEN** the system returns the current first page marked as a cursor reset

#### Scenario: Cursor anchor is no longer active

- **WHEN** a comment page request uses a cursor whose anchor was removed or no longer belongs to the
  authorized memory
- **THEN** the system returns the current first page marked as a cursor reset without exposing why the
  anchor is unavailable

#### Scenario: Client receives a cursor reset

- **WHEN** the interface receives a cursor-reset page after comments were accumulated
- **THEN** it replaces the history, avoids duplicates, and announces that comments were refreshed

### Requirement: Idempotent comment submission

Each logical submission SHALL carry an opaque idempotency key generated by the client and bound on the
server to the authenticated author and normalized request fingerprint. Repeating a completed submission
with the same key and content MUST return the original comment without creating another record. Reusing
the key for different content MUST be rejected. The interface MUST disable submission while one request is
pending.

#### Scenario: Member activates submit twice while pending

- **WHEN** a member attempts a second activation before the first request completes
- **THEN** the interface sends only the pending logical submission

#### Scenario: Completed request is retried

- **WHEN** the same author retries the same normalized content with the same completed idempotency key
- **THEN** the system returns the original comment and creates no duplicate

#### Scenario: Key is reused for different content

- **WHEN** an author submits different normalized content with a previously used idempotency key
- **THEN** the system rejects the mismatched request and creates no additional comment

### Requirement: Recoverable comment composer feedback

The composer SHALL have a persistent accessible label, visible character count, field-associated helper
or validation text, and a clear submit action. Whitespace-only or over-limit drafts MUST disable
submission. While pending, the request draft and key MUST remain stable and submission MUST be disabled.
Failure MUST preserve the entered text and provide an accessible retry path. Success MUST clear the draft,
place the returned comment once at the start of the history, refresh local comment data, and announce the
outcome without relying on color or moving focus unexpectedly.

#### Scenario: Member enters a valid draft

- **WHEN** the trimmed draft becomes valid
- **THEN** the submit action becomes available and the character count reflects the draft length

#### Scenario: Submission is pending

- **WHEN** a valid comment request is in progress
- **THEN** the composer preserves its submitted text, prevents editing and duplicate submission, and
  communicates progress

#### Scenario: Submission succeeds

- **WHEN** the server returns the created or previously completed comment
- **THEN** the interface clears the draft, displays that comment exactly once at the beginning of the
  history, refreshes local comment data, and announces success politely

#### Scenario: Submission fails recoverably

- **WHEN** comment creation fails for a reason other than memory unavailability
- **THEN** the interface preserves the draft, explains the failure near the composer, and offers retry

#### Scenario: Memory becomes unavailable during submission

- **WHEN** comment creation returns the generic unavailable outcome
- **THEN** the interface transitions to the existing generic memory not-found experience and exposes no
  stale comment data

### Requirement: Independent and understandable history states

The comment section SHALL provide understandable initial loading, empty, initial error, load-more
pending, load-more error, refreshed, and complete-history states. An initial history failure MUST keep an
otherwise authorized composer usable and provide a retry for history. A load-more failure MUST retain all
loaded comments and retry only the failed next-page request. Realtime partner updates are not required;
local successful actions MUST refresh the history.

#### Scenario: Initial history is loading

- **WHEN** the first comment page has not resolved
- **THEN** the section preserves its final geometry with a comment-list loading presentation and no
  fabricated content

#### Scenario: Memory has no comments

- **WHEN** the first comment page succeeds with no active comments
- **THEN** the section shows an inviting empty message while keeping the composer available

#### Scenario: Initial history fails

- **WHEN** the first comment page fails while the memory remains available
- **THEN** the section shows a history-specific error and retry while keeping the composer usable

#### Scenario: Additional history is loading

- **WHEN** a member requests an available next page
- **THEN** loaded comments remain visible and the load-more control communicates its pending state

#### Scenario: Additional history fails

- **WHEN** a next-page request fails
- **THEN** loaded comments remain visible and the failed page can be retried

### Requirement: Accessible responsive comments section

The comments section SHALL use semantic headings, list structure, form controls, status messaging, and
keyboard-operable actions. Validation MUST be programmatically associated with the composer, async status
MUST be announced, focus MUST remain predictable, and color MUST NOT be the only state indicator. The
composition MUST remain readable and operable in the existing mobile and desktop memory-detail layouts,
with controls meeting a minimum 44-by-44 CSS-pixel target and motion respecting reduced-motion settings.

#### Scenario: Keyboard member submits a comment

- **WHEN** a keyboard member focuses the composer, enters valid text, and activates submit
- **THEN** submission completes without requiring pointer input and focus remains in a predictable place

#### Scenario: Validation fails

- **WHEN** submission or blur reveals an invalid draft
- **THEN** the error is visible, announced, associated with the composer, and does not erase the draft

#### Scenario: Layout reflows

- **WHEN** the detail view is used at mobile, 640 px, 768 px, or 1024 px widths
- **THEN** comment text wraps, actions remain reachable, source order remains logical, and no horizontal
  document overflow is introduced

### Requirement: Author-owned versioned comment edits

The system SHALL allow an authenticated active member to edit the normalized plain-text body of an active
comment they authored on an available Timeline or shared Private Vault memory in their active space. The
system MUST derive the author, membership, space, comment, and memory access from the authenticated session
and MUST NOT trust client-supplied identity or ownership values. The updated value MUST meet the existing
trimmed 1-to-1,000 Unicode-character comment constraint, preserve intentional internal line breaks, and
render as inert plain text. A successful edit MUST preserve the comment identity, author, memory, creation
timestamp, and current author attribution while returning server-owned update metadata.

#### Scenario: Author updates an active comment

- **WHEN** a comment author submits a valid edit against the current version of an active accessible comment
- **THEN** the system stores the normalized text, advances its server-owned version, and returns the updated
  comment

#### Scenario: Non-author attempts an edit

- **WHEN** another active member submits an edit for a comment they did not author
- **THEN** the system makes no change and returns the generic not-found outcome without revealing ownership

#### Scenario: Edit validation fails

- **WHEN** an author submits empty, whitespace-only, or over-limit replacement text
- **THEN** the system rejects the edit without changing the persisted comment and the interface preserves the
  attempted text for correction

#### Scenario: Comment or memory is unavailable

- **WHEN** an edit targets a missing, inactive, soft-deleted, cross-space, or inaccessible comment or memory
- **THEN** the system makes no change and returns the generic not-found outcome without exposing record state

### Requirement: Optimistic concurrency for comment edits

The system SHALL condition each comment edit on the server-owned version that the author originally read.
When the current stored version differs from the submitted expected version, the system MUST make no change
and return a conflict outcome only to an otherwise authorized author. The interface MUST preserve the
author's attempted text, identify that the comment changed elsewhere, and provide a refresh or cancel path;
it MUST NOT silently overwrite the newer persisted text. A deleted or inaccessible target MUST remain
indistinguishable from other unavailable targets rather than being reported as a conflict.

#### Scenario: Concurrent edit is detected

- **WHEN** an author submits a valid replacement using an outdated comment version
- **THEN** the system preserves the newer persisted text, returns a conflict outcome, and keeps the author's
  attempted text available for reconciliation

#### Scenario: Author refreshes after a conflict

- **WHEN** an author refreshes comment history after receiving a conflict outcome
- **THEN** the interface shows the current persisted comment and allows the author to begin a new edit

#### Scenario: Author cancels an edit

- **WHEN** an author cancels an in-progress or conflicted edit
- **THEN** the interface discards only the local attempted text and leaves the persisted comment unchanged

### Requirement: Accessible author edit controls

The interface SHALL display an edit action only for comments authored by the authenticated member. Edit
controls, validation, pending feedback, conflict messaging, save, cancel, and recovery actions MUST be
keyboard operable, have clear accessible names, keep focus predictable, and announce asynchronous outcomes.
The comment history MUST reconcile a successful edit by comment identity without duplicates or stale local
text.

#### Scenario: Author edits by keyboard

- **WHEN** a comment author activates Edit with the keyboard, changes valid text, and saves
- **THEN** the edit completes without requiring pointer input, the updated text appears once, and feedback is announced

#### Scenario: Another member reads the history

- **WHEN** a member views a comment authored by their partner
- **THEN** the comment exposes no edit control and remains readable as current persisted text
