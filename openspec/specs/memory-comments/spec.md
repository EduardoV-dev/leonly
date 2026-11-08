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

The system SHALL page root comments with at most 20 records in descending `(createdAt, id)` order.
Active roots and deleted roots with visible replies participate; other deleted roots do not. The opaque
cursor SHALL preserve the complete ordering tuple. For an unchanged dataset, traversal MUST NOT skip or
duplicate records.

#### Scenario: First comment page is requested

- **WHEN** an authorized member opens a memory with more than 20 eligible root comments
- **THEN** the system returns the newest 20 in deterministic order and a next cursor

#### Scenario: Next comment page is requested

- **WHEN** an authorized member requests the next page with a current valid cursor
- **THEN** the system returns the next distinct eligible roots after the complete cursor tuple

#### Scenario: Final page is reached

- **WHEN** a returned page has no additional eligible root comments
- **THEN** the system returns no next cursor and the interface offers no load-more action

#### Scenario: Comment is soft-deleted

- **WHEN** a root comment is deleted
- **THEN** it appears only as a placeholder if it has visible replies and otherwise is excluded

### Requirement: Safe invalid and stale cursor recovery

Malformed cursor encodings or payloads SHALL return a safe validation error. A valid cursor whose anchor
or scope is no longer current SHALL signal a pagination reset without exposing inaccessible data. The
client MUST discard accumulated pages and restart without a cursor.

#### Scenario: Cursor cannot be decoded

- **WHEN** a comment page request contains a malformed cursor
- **THEN** the API returns a validation error without using it in a query

#### Scenario: Cursor anchor is no longer active

- **WHEN** a cursor anchor is no longer eligible or belongs to a different authorized scope
- **THEN** the response signals a reset without exposing why the anchor is unavailable

#### Scenario: Client receives a cursor reset

- **WHEN** the interface receives a reset indication after accumulating comments
- **THEN** it discards the pagination chain, reloads the first page, and announces the refresh

### Requirement: Soft-deleted comments remain absent from product reads

The system SHALL never expose a deleted comment's body or author actions. A deleted root with visible
replies SHALL appear as a placeholder; deleted replies and deleted roots without visible replies SHALL
be excluded. Counts SHALL reflect visible replies only.

#### Scenario: History is refreshed after a local deletion

- **WHEN** an authorized member refreshes after deleting a comment
- **THEN** history and reply counts reflect the deletion and any eligible root placeholder

#### Scenario: Cursor anchor was deleted

- **WHEN** a cursor anchor no longer belongs in the eligible result set after deletion
- **THEN** the response signals a reset without exposing why the anchor is unavailable

### Requirement: Comment submission

The interface MUST disable submission while one request is pending. Each accepted request creates a
comment; retries after an uncertain response can create another comment.

#### Scenario: Member activates submit twice while pending

- **WHEN** a member attempts a second activation before the first request completes
- **THEN** the interface sends only the pending logical submission

### Requirement: Recoverable comment composer feedback

The composer SHALL have a persistent accessible label, visible character count, field-associated helper
or validation text, and a clear submit action. Whitespace-only or over-limit drafts MUST disable
submission. While pending, the request draft MUST remain stable and submission MUST be disabled.
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

Timeline and Vault detail screens SHALL mount the migrated comments section for available memories.
Controls MUST be semantic, keyboard operable, responsive, and accessible, with associated validation,
announced asynchronous status, predictable focus, minimum 44-by-44 CSS-pixel targets, and reduced-motion
support.

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

#### Scenario: Member views detail at any supported width
- **WHEN** a member opens an available Timeline or Vault detail screen at supported widths
- **THEN** the comments section is available and uses the current backend

### Requirement: Author-owned versioned comment edits

An authenticated active member SHALL edit only their own active comment or reply on an available memory
in their active space. The system MUST derive ownership and scope from the session, validate normalized
1–1,000 Unicode-character plain text, preserve identity and creation metadata, and return the updated
comment and server-owned timestamp.

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

The system SHALL atomically condition each edit on `lastKnownUpdatedAt` matching the full-precision
server-owned timestamp. A stale value produces a conflict only for an otherwise authorized author,
preserves persisted content and the attempted draft, and requires explicit refresh or cancel. Unavailable
targets remain generic not-found outcomes.

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

### Requirement: Single-level comment replies

An active member SHALL reply to an active root comment of an available memory. Replies MUST share the
root's memory and space and MUST NOT have replies of their own. Parent identity is immutable, and reply
creation MUST be serialized with root deletion.

#### Scenario: Member replies to a root

- **WHEN** an active member submits a valid reply to an active root in the same memory
- **THEN** the reply is created under that root with server-derived author and space

#### Scenario: Parent is unavailable or is a reply

- **WHEN** the supplied parent is deleted, inaccessible, belongs elsewhere, or is itself a reply
- **THEN** no reply is created and no protected parent information is exposed

#### Scenario: Deletion races reply creation

- **WHEN** a root deletion commits before a competing reply creation
- **THEN** reply creation fails without attaching a new reply to the deleted root

### Requirement: On-demand paginated replies

Root comments with visible replies SHALL offer an accessible see-replies action. Expanding it SHALL fetch
a bounded cursor page ordered by `(createdAt, id)` ascending. Replies SHALL be indented once, support author

#### Scenario: Member expands a thread

- **WHEN** a member activates see replies
- **THEN** the client requests that root's replies and renders the first page in ascending order

#### Scenario: More replies exist

- **WHEN** the member requests a subsequent valid cursor page
- **THEN** the next distinct replies are appended in deterministic order without gaps for unchanged data

#### Scenario: Thread request fails

- **WHEN** loading a thread or next page fails
- **THEN** previously loaded replies remain visible and an accessible retry is offered

#### Scenario: Replies are changed

- **WHEN** a reply is created, edited, or deleted
- **THEN** the affected thread and root reply count are reconciled with server state

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
