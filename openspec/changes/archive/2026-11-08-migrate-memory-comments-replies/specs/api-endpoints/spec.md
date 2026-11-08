## ADDED Requirements

### Requirement: Memory comment operations

The API SHALL expose authenticated `GET` and `POST /api/memories/:memoryId/comments`, `PATCH` and `DELETE /api/memories/:memoryId/comments/:commentId`, and `GET /api/memories/:memoryId/comments/:commentId/replies`. It MUST use current-backend data, shared response envelopes, session-derived membership, and non-enumerating authorization.

#### Scenario: Member reads or writes a comment
- **WHEN** an active member calls a comment endpoint for an available memory
- **THEN** the API applies the comment capability's validation and authorization and returns the documented shared response

#### Scenario: Session or resource is unavailable
- **WHEN** authentication is missing or a memory or comment is inaccessible
- **THEN** the API returns 401 for missing authentication or a generic 404 for an unavailable resource without exposing comment data

### Requirement: Comment page contract

Root and reply reads SHALL return a shared cursor-page response with nullable `nextCursor` and boolean `resetCursor`. Cursors MUST preserve the full timestamp and ID ordering tuple, be validated, and never grant authorization. Malformed cursors SHALL produce a safe 400; invalidated chains SHALL signal reset.

#### Scenario: Empty or final page
- **WHEN** no further eligible comments or replies exist
- **THEN** the API returns a successful page with `nextCursor: null` and `resetCursor: false`

#### Scenario: Cursor scope or anchor is invalidated
- **WHEN** a valid cursor no longer matches the requested authorized list or eligible anchor
- **THEN** the response signals reset without exposing protected data

### Requirement: Shared optimistic-lock request field

The API SHALL accept `lastKnownUpdatedAt` as the precision-preserving optimistic-lock field for comment mutations and the existing space-name, start-date, and display-name update operations. Clients SHALL send the exact last observed `updatedAt`; the old `expectedUpdatedAt` field is replaced.

#### Scenario: Current timestamp is submitted
- **WHEN** an authorized client sends the current `lastKnownUpdatedAt`
- **THEN** the API evaluates the mutation atomically and returns its updated canonical timestamp on success

#### Scenario: Stale timestamp is submitted
- **WHEN** an otherwise authorized client sends a stale timestamp
- **THEN** the API returns 409 without overwriting newer data

#### Scenario: Old or invalid field is submitted
- **WHEN** a client supplies the old field instead of `lastKnownUpdatedAt` or an invalid timestamp
- **THEN** the API rejects the request as invalid without mutating data

### Requirement: Document comment operations

The local API reference SHALL describe all comment routes, session authorization, one-level replies, pagination, deletion placeholders, locking, and error responses.

#### Scenario: Developer inspects the API reference
- **WHEN** a developer opens the local API documentation
- **THEN** the comment operations and request and response schemas reflect the implemented contract
