## MODIFIED Requirements

### Requirement: Deterministic bounded comment history

The system SHALL page root comments with at most 20 records in descending `(createdAt, id)` order. Active roots and deleted roots with visible replies participate; other deleted roots do not. The opaque cursor SHALL preserve the complete ordering tuple. For an unchanged dataset, traversal MUST NOT skip or duplicate records.

#### Scenario: First comment page is requested
- **WHEN** an authorized member opens a memory with more than 20 eligible root comments
- **THEN** the system returns the newest 20 in deterministic order and a next cursor

#### Scenario: Next comment page is requested
- **WHEN** an authorized member requests the next page with a current valid cursor
- **THEN** the system returns the next distinct eligible roots after the complete cursor tuple

#### Scenario: Final page is reached
- **WHEN** a returned page has no additional eligible roots
- **THEN** the system returns a null next cursor and the interface offers no load-more action

#### Scenario: Comment is soft-deleted
- **WHEN** a root comment is deleted
- **THEN** it appears only as a placeholder if it has visible replies and otherwise is excluded

### Requirement: Safe invalid and stale cursor recovery

Malformed cursor encodings or payloads SHALL return a safe validation error. A valid cursor whose anchor or scope is no longer current SHALL signal a pagination reset without exposing inaccessible data. The client MUST discard accumulated pages and restart without a cursor.

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

The system SHALL never expose a deleted comment's body or author actions. A deleted root with visible replies SHALL appear as a placeholder; deleted replies and deleted roots without visible replies SHALL be excluded. Counts SHALL reflect visible replies only.

#### Scenario: History is refreshed after a local deletion
- **WHEN** an authorized member refreshes after deleting a comment
- **THEN** history and reply counts reflect the deletion and any eligible root placeholder

#### Scenario: Cursor anchor was deleted
- **WHEN** a cursor anchor no longer belongs in the eligible result set after deletion
- **THEN** the response signals a reset without exposing why the anchor is unavailable

### Requirement: Accessible responsive comments section

Timeline and Vault detail screens SHALL mount the migrated comments section for available memories. Controls MUST be semantic, keyboard operable, responsive, and accessible, with associated validation, announced asynchronous status, predictable focus, minimum 44-by-44 CSS-pixel targets, and reduced-motion support.

#### Scenario: Keyboard member submits a comment
- **WHEN** a keyboard member enters valid text and submits
- **THEN** submission completes without pointer input and focus remains predictable

#### Scenario: Validation fails
- **WHEN** validation reveals an invalid draft
- **THEN** the error is visible, announced, associated with the composer, and the draft remains intact

#### Scenario: Layout reflows
- **WHEN** the detail view is used at mobile, 640 px, 768 px, or 1024 px widths
- **THEN** content wraps, actions remain reachable, and no horizontal document overflow is introduced

#### Scenario: Member views detail at any supported width
- **WHEN** a member opens an available Timeline or Vault detail screen
- **THEN** the comments section is available and uses the current backend

### Requirement: Author-owned versioned comment edits

An authenticated active member SHALL edit only their own active comment or reply on an available memory in their active space. The system MUST derive ownership and scope from the session, validate normalized 1–1,000 Unicode-character plain text, preserve identity and creation metadata, and return the updated comment and server-owned timestamp.

#### Scenario: Author updates an active comment
- **WHEN** an author submits a valid edit with the current last-known update timestamp
- **THEN** the system stores the normalized text and returns the comment with an advanced update timestamp

#### Scenario: Non-author attempts an edit
- **WHEN** another member submits an edit
- **THEN** no change occurs and the generic not-found outcome does not reveal ownership

#### Scenario: Edit validation fails
- **WHEN** replacement text is empty, whitespace-only, or over the limit
- **THEN** the system rejects it and the interface preserves the attempted text

#### Scenario: Comment or memory is unavailable
- **WHEN** the target is missing, inactive, deleted, cross-space, or inaccessible
- **THEN** no change occurs and the generic not-found outcome exposes no record state

### Requirement: Optimistic concurrency for comment edits

The system SHALL atomically condition each edit on `lastKnownUpdatedAt` matching the full-precision server-owned timestamp. A stale value produces a conflict only for an otherwise authorized author, preserves persisted content and the attempted draft, and requires explicit refresh or cancel. Unavailable targets remain generic not-found outcomes.

#### Scenario: Concurrent edit is detected
- **WHEN** an author submits an edit with an outdated timestamp
- **THEN** the system returns a conflict without overwriting newer text and retains the draft

#### Scenario: Author refreshes after a conflict
- **WHEN** an author refreshes the conflicting comment
- **THEN** the current persisted comment is shown and the author can explicitly begin a new edit

#### Scenario: Author cancels an edit
- **WHEN** an author cancels an in-progress or conflicted edit
- **THEN** only the local attempted text is discarded and persisted content remains unchanged

## ADDED Requirements

### Requirement: Single-level comment replies

An active member SHALL reply to an active root comment of an available memory. Replies MUST share the root's memory and space and MUST NOT have replies of their own. Parent identity is immutable, and reply creation MUST be serialized with root deletion.

#### Scenario: Member replies to a root
- **WHEN** an active member submits a valid reply to an active root in the same memory
- **THEN** the reply is created under that root with server-derived author and space

#### Scenario: Parent is unavailable or is a reply
- **WHEN** the supplied parent is deleted, inaccessible, belongs elsewhere, or is itself a reply
- **THEN** no reply is created and no protected parent information is exposed

#### Scenario: Deletion races reply creation
- **WHEN** a root deletion commits before a competing reply creation
- **THEN** the reply creation fails without attaching a new reply to the deleted root

### Requirement: On-demand paginated replies

Root comments with visible replies SHALL offer an accessible see-replies action. Expanding it SHALL fetch a bounded cursor page ordered by `(createdAt, id)` ascending. Replies SHALL be indented once, support author actions, and show no reply action. Counts exclude deleted replies.

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
