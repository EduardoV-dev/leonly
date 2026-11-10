## MODIFIED Requirements

### Requirement: Memory detail response contract

Successful detail responses SHALL use shared `ApiResponse` and detail types. Data SHALL include id,
title, date-only memory date, nullable description and location, visibility, creation and update
timestamps, creator display name, nullable avatar, ordered photos, and bounded related summaries. Photo
URLs SHALL be nullable. `reaction` with the shared reaction summary SHALL be included. Comment, opaque mutation-version, and object-key fields SHALL NOT be included. `updatedAt` SHALL preserve full database timestamp precision for exact optimistic-lock round trips.

#### Scenario: Authorized detail has related memories

- **WHEN** an active member requests a matching memory with eligible neighbors
- **THEN** the response contains only same-space, same-visibility summaries, excluding the parent and social data, ordered by memory date, creation time, and ID descending and bounded by the existing related-card limit

#### Scenario: Detail has optional or no photo data

- **WHEN** description, location, avatar, photos, or a photo variant are absent
- **THEN** the response represents the missing values as null or an empty collection without fabricating content

#### Scenario: Detail timestamp is used for placement

- **WHEN** a client submits the detail's unchanged `updatedAt` as `lastKnownUpdatedAt` for an otherwise eligible placement request
- **THEN** the version matches even when the database timestamp contains sub-millisecond precision

### Requirement: Shared optimistic-lock request field

The API SHALL accept `lastKnownUpdatedAt` as the precision-preserving optimistic-lock field for comment
mutations, memory placement, and the existing space-name, start-date, and display-name update operations. Clients SHALL send
the exact last observed `updatedAt`; this replaces `expectedUpdatedAt`.

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

### Requirement: Place an active-space memory

`PATCH /api/memories/:memoryId/placement` SHALL require a valid session and accept only `{ visibility, lastKnownUpdatedAt }`, with visibility `timeline` or `vault`. It SHALL derive membership and space server-side and change only eligible current-backend placement and audit fields. HTTP 200 SHALL return shared `ApiResponse` data `{ id, visibility, updatedAt }` with the committed exact timestamp and `Cache-Control: no-store`.

#### Scenario: Active member moves a memory

- **WHEN** either active member supplies the current timestamp and opposite visibility for an eligible memory
- **THEN** HTTP 200 returns its identifier, destination visibility, and advanced canonical update timestamp in the standard success envelope

#### Scenario: Placement body is invalid

- **WHEN** the request has missing fields, an invalid timestamp or visibility, or extra fields including supplied ownership or space
- **THEN** HTTP 400 returns the standard error envelope without changing any data

### Requirement: Placement endpoint failure boundaries

Placement SHALL return 401 for an invalid session and the same generic 404 for absent active membership or malformed, missing, inactive, deleted, other-space, inaccessible, or already-at-target memories. An eligible stale request SHALL return 409. Unexpected failures SHALL return a safe server error. Failures MUST use the standard error envelope without exposing protected state or falling back to Supabase.

#### Scenario: Placement session is unavailable

- **WHEN** a placement request has no valid session
- **THEN** HTTP 401 exposes no memory data and makes no change

#### Scenario: Placement target is unavailable

- **WHEN** an authenticated request has no active membership or targets a malformed, missing, inactive, deleted, other-space, inaccessible, or already-at-target memory
- **THEN** the same generic HTTP 404 exposes no record or lifecycle details and makes no change

#### Scenario: Placement version is stale

- **WHEN** the memory remains eligible but its update timestamp differs from `lastKnownUpdatedAt`
- **THEN** HTTP 409 returns no mutation success and leaves the current state unchanged

#### Scenario: Placement fails unexpectedly

- **WHEN** an unexpected backend failure prevents placement from committing
- **THEN** a safe server error is returned without partial writes, internal details, or a Supabase fallback

### Requirement: Document placement operations

The local OpenAPI document and Scalar reference SHALL describe the placement route, authentication, strict request fields, success and error envelopes, and unavailable-versus-conflict behavior. Both memory detail schemas SHALL document `updatedAt` as an exact timestamp suitable for `lastKnownUpdatedAt` without conversion or truncation.

#### Scenario: Developer inspects placement documentation

- **WHEN** a developer opens the local API reference
- **THEN** the placement operation and detail examples describe the same fields, timestamp precision, authentication, and failure statuses as the API
