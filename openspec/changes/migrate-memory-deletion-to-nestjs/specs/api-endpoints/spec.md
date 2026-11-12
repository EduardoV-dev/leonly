## MODIFIED Requirements

### Requirement: Shared optimistic-lock request field

The API SHALL accept `lastKnownUpdatedAt` as the precision-preserving optimistic-lock field for comment
mutations, memory placement, and the existing space-name, start-date, and display-name
update operations. Clients SHALL send the exact last observed `updatedAt`; this replaces `expectedUpdatedAt`.

#### Scenario: Current timestamp is submitted

- **WHEN** an authorized client sends the current `lastKnownUpdatedAt`
- **THEN** the API evaluates the mutation atomically and returns its updated canonical timestamp on success

#### Scenario: Stale timestamp is submitted

- **WHEN** an otherwise authorized client sends a stale timestamp for an eligible resource
- **THEN** the API returns 409 without overwriting newer data

#### Scenario: Old or invalid field is submitted

- **WHEN** a client supplies the old field instead of `lastKnownUpdatedAt` or an invalid timestamp
- **THEN** the API rejects the request as invalid without mutating data

## ADDED Requirements

### Requirement: Delete an active-space memory

`DELETE /api/memories/:memoryId` SHALL require a valid session and no request body or version token.
It SHALL derive membership and space server-side and apply the ordered cascading soft deletion to that
memory only. A successful deletion SHALL return HTTP 200 with the shared `ApiResponse` envelope whose `data`
is `null`, whose `error` is empty, and with `Cache-Control: no-store`. The success response MUST NOT include
the deleted identifier or any other payload.

#### Scenario: Active member deletes a memory

- **WHEN** either active member confirms deletion of an eligible memory and sends a bodyless request
- **THEN** HTTP 200 returns `{ ok: true, data: null, error: [] }` and the memory, its comments, reactions, and attached files are marked deleted or deleting

#### Scenario: Version token is not required

- **WHEN** an authorized deletion request contains no body and the memory remains available
- **THEN** it is evaluated against the current locked state without requiring `lastKnownUpdatedAt` or comparing a client version

### Requirement: Memory deletion endpoint failure boundaries

Deletion SHALL map each failure to one response status and SHALL leave no partial change on any failure.

#### Scenario: Failures use the defined statuses
- **WHEN** a deletion request supplies a malformed identifier, fails authentication, targets an unavailable memory, or hits an unexpected error
- **THEN** it returns 400, 401, the generic 404, or a safe 500 respectively, each in the standard error envelope; memory version changes do not produce a deletion conflict

#### Scenario: Repeated deletion of a deleted memory
- **WHEN** a deletion request targets a memory that is already soft-deleted
- **THEN** it returns the same generic 404 as any unavailable memory

#### Scenario: Deletion session is unavailable

- **WHEN** a deletion request has no valid session
- **THEN** HTTP 401 exposes no memory data and makes no change

#### Scenario: Deletion target is unavailable

- **WHEN** an authenticated request has no active membership or targets a missing, inactive, already deleted, other-space, or inaccessible memory
- **THEN** the same generic HTTP 404 exposes no record or lifecycle details and makes no change

#### Scenario: Deletion identifier is malformed

- **WHEN** a deletion request targets an identifier that is not a valid UUID
- **THEN** HTTP 400 rejects the request with the shared validation failure and makes no change

#### Scenario: Another mutation commits before deletion

- **WHEN** another mutation commits before deletion obtains its lock and the memory remains available
- **THEN** deletion applies to the current state, including committed comments and reactions, without a stale-version 409

#### Scenario: Cascade step fails unexpectedly

- **WHEN** an unexpected backend failure occurs while marking comments, reactions, or files
- **THEN** the whole transaction rolls back, the memory stays active, and a safe server error is returned without partial writes, internal details, or a Supabase fallback

### Requirement: Document memory deletion operations

The local OpenAPI document and Scalar reference SHALL describe the bodyless deletion route, authentication,
the null success payload, the cascade behavior, and generic unavailable outcomes without a version-conflict contract.

#### Scenario: Developer inspects deletion documentation

- **WHEN** a developer opens the local API reference
- **THEN** the deletion operation describes the same body, response, authentication, and failure statuses as the API
