# API Endpoints Specification

## Purpose
Define the public URL prefix and the first documented API contracts. OpenSpec records behavior;
the local Node server serves an OpenAPI document for the Scalar reference.

## Requirements

### Requirement: Shared API prefix
Every application endpoint SHALL be served under `/api` in both the local Node server and the
Lambda handler. The shared application bootstrap SHALL apply the prefix before route registration;
the directly mounted Better Auth handler SHALL remain reachable at `/api/auth/*` without a second
prefix. Unprefixed application routes SHALL NOT resolve.

#### Scenario: Local and Lambda entry points
- **WHEN** either entry point creates the API application
- **THEN** health is reachable at `GET /api/health`, space creation at `POST /api/spaces`, and
  authentication routes at `/api/auth/*`

### Requirement: Health endpoint
`GET /api/health` SHALL return HTTP 200 with the standard application response envelope containing
`{ "status": "ok" }`.

#### Scenario: Health check succeeds
- **WHEN** a client requests `GET /api/health`
- **THEN** the response contains `ok: true`, `data.status: "ok"`, `error: []`, and
  `message: "Request completed successfully"`

### Requirement: Create a space
`POST /api/spaces` SHALL accept JSON with `space_name` (2 to 100 characters), `start_date`
(`YYYY-MM-DD`, no later than today in `timezone`), `timezone` (valid IANA timezone), and optional
`display_name` (2 to 100 characters when supplied). The endpoint SHALL require an authenticated
Better Auth session. It SHALL NOT require an `Origin` header. On success it SHALL return HTTP 200
with the standard response envelope and `data.space_id`. Invalid input, missing session, and an
existing active membership SHALL return HTTP 400, 401, and 409 respectively.

#### Scenario: Valid creation request
- **WHEN** an eligible authenticated user sends valid fields without an `Origin` header
- **THEN** the API returns the new `space_id` in the standard success envelope

#### Scenario: Invalid or unauthorized creation request
- **WHEN** validation, session, or active-membership checks fail
- **THEN** the API returns the applicable status and a standard error envelope without creating a space

### Requirement: Validate a space invite
`POST /api/spaces/invite-validations` SHALL require an authenticated Better Auth session and accept
JSON containing `invite_code`. The current user's identity SHALL come from the session, never from
the request body. A usable invite SHALL return HTTP 200 with the standard success envelope and
`data.valid: true`, without disclosing space or member data. Malformed codes SHALL return HTTP 400;
unknown, expired, consumed, self-join, already-member, deleted, or full-space invites SHALL return
the same generic HTTP 404 error. Missing authentication SHALL return HTTP 401. A user whose
fixed-window failure allowance is exhausted SHALL receive HTTP 429 with a positive `Retry-After`
header describing the time until the window resets and the join-rate-limit message in the standard
error envelope. Unexpected failures SHALL use a generic HTTP 500 error without revealing invite state.

#### Scenario: Authenticated user validates a current invite
- **WHEN** an eligible user posts a usable invite code
- **THEN** the response contains `data.valid: true` without identifying the space or its members

#### Scenario: Invalid or unavailable invite is validated
- **WHEN** a user posts a malformed code or an invite that cannot be used
- **THEN** the API returns the applicable 400 or generic 404 error without space information

#### Scenario: Validation is unauthenticated or rate-limited
- **WHEN** the request has no valid session or the user's fixed-window failure allowance is exhausted
- **THEN** the API returns 401 or 429 respectively, and a 429 includes the remaining `Retry-After` seconds

### Requirement: Redeem a space invite
`POST /api/spaces/memberships` SHALL require an authenticated Better Auth session and accept JSON
containing `invite_code` and optional `display_name`. On success it SHALL return HTTP 200 with the
standard success envelope and only `data.space_id` for routing. A malformed code or invalid supplied
name SHALL return HTTP 400 (with `field: "display_name"` for a name error); unavailable invites SHALL
return the same generic HTTP 404 error as validation. Missing authentication SHALL return HTTP 401,
an exhausted fixed-window failure allowance SHALL return HTTP 429 with `Retry-After` until the window
resets, and unexpected failures SHALL return a generic HTTP 500 error. These failures MUST NOT expose
space or member data.

#### Scenario: Eligible user redeems an invite
- **WHEN** an authenticated user without a space posts a current invite and a valid or omitted name
- **THEN** the response contains only the joined `space_id` in the standard success envelope

#### Scenario: Invalid name or unavailable invite is redeemed
- **WHEN** the supplied name is invalid or the invite cannot be redeemed
- **THEN** the API returns a field-specific 400 or a generic 404 respectively without creating membership

#### Scenario: Redemption is unauthenticated or rate-limited
- **WHEN** the request has no valid session or the user's fixed-window failure allowance is exhausted
- **THEN** the API returns 401 or 429 respectively, and a 429 includes `Retry-After`

### Requirement: Read the current active space
`GET /api/users/me/space` SHALL require an authenticated Better Auth session and SHALL resolve the active membership from that session, without accepting a user or space identifier from the caller. For an active membership in a non-deleted active space, HTTP 200 SHALL return the standard response envelope with the space identifier, name, date-only start date, current invite code and expiry (each nullable), onboarding completion time (nullable), and one or two active members' display names and nullable avatars. A caller without an active membership SHALL receive HTTP 200 with `data: null`. An unauthenticated caller SHALL receive HTTP 401 with the standard error envelope. An unexpected lookup failure MUST NOT be represented as an absent membership.

#### Scenario: Member reads their active space
- **WHEN** a signed-in member requests the active-space endpoint
- **THEN** the response contains only the non-deleted space linked to that member and its active members, with the persisted invite and onboarding fields

#### Scenario: Caller has no active membership
- **WHEN** a signed-in user without an active membership requests the endpoint
- **THEN** it returns HTTP 200 with `data: null` and no other user's space information

#### Scenario: Caller is unauthenticated
- **WHEN** a request without a valid session reaches the endpoint
- **THEN** it returns HTTP 401 without reading or exposing a space

#### Scenario: Membership or lookup is unavailable
- **WHEN** the only membership or its space is deleted, or the active-space lookup fails
- **THEN** deleted data is never returned and an unexpected failure is distinguishable from the no-membership result

### Requirement: Interactive API reference
Only the local Node server SHALL serve the current Nest endpoint schema at `GET /openapi.json` and
the Scalar reference at `GET /docs`. OpenAPI paths SHALL include the `/api` prefix. The Lambda
handler SHALL NOT mount documentation routes. API Gateway SHALL route only `/api` and its child
paths to Lambda. Better Auth routes are mounted outside Nest and SHALL NOT be represented as
automatically generated Nest endpoints.

#### Scenario: Reader opens the reference
- **WHEN** a reader visits `/docs` on the local Node server
- **THEN** Scalar loads `/openapi.json`, including the health and space creation contracts

#### Scenario: Documentation is unavailable through Lambda
- **WHEN** a client requests `/docs` or `/openapi.json` through API Gateway
- **THEN** neither request is routed to Lambda

### Requirement: Read active-space memory lists
`GET /api/memories/timeline` and `GET /api/memories/vault` SHALL require a Better Auth session and
derive the active space from its active membership. They SHALL read only new-backend records, exclude
deleted memories and spaces, and return only the route's visibility. They MUST NOT query Supabase or
accept caller-supplied user or space identifiers as authority. Missing membership SHALL produce a
generic HTTP 404; missing authentication SHALL produce HTTP 401.

#### Scenario: Member reads either list
- **WHEN** an active member requests the Timeline or Vault endpoint
- **THEN** HTTP 200 contains only eligible new-backend memories in that member's active space and the
  requested visibility

#### Scenario: Only legacy records exist
- **WHEN** Supabase contains memories but the new backend has no eligible memories
- **THEN** the endpoint returns a successful empty page without reading or importing the legacy records

### Requirement: Validate memory list query parameters
Both list endpoints SHALL accept optional `cursor` and `sort`, with `sort` limited to `newest` or
`oldest` and defaulting to `newest`. Both SHALL accept integer `limit` from 1 through 20, defaulting
to 10. Unsupported parameters, invalid limits or sorts, and malformed cursors SHALL return HTTP 400
in the standard error envelope.

#### Scenario: Dashboard requests a smaller page
- **WHEN** an authorized caller requests Timeline with `limit=4`
- **THEN** the response contains at most four eligible memories and correctly indicates whether
  another page exists

#### Scenario: Query validation fails
- **WHEN** a request supplies an invalid sort, an out-of-range or non-integer limit, unsupported
  parameters, or an invalid cursor encoding or shape
- **THEN** the API returns HTTP 400 without using the invalid values in a database predicate

### Requirement: Memory list response contract
Successful lists SHALL return the standard `ApiResponse` envelope whose `data` contains `data` (items)
and `meta` (`nextCursor`, nullable, and `cursorReset`, boolean). Each item SHALL contain `id`, `title`,
`memoryDate`, `createdAt`, nullable `description`, nullable `location`, and nullable `coverPhotoUrl`.
Items MUST omit comment counts and reaction data; terminal and empty pages SHALL emit
`nextCursor: null`.

#### Scenario: Page contains eligible items
- **WHEN** a list request succeeds
- **THEN** the API returns HTTP 200 with `ok: true`, `error: []`, a message, and the documented page
  and item fields without comments or reactions

#### Scenario: List lookup fails unexpectedly
- **WHEN** an unexpected database or application failure prevents listing
- **THEN** the API returns a generic HTTP 500 error envelope rather than an empty success or internal
  error details

### Requirement: Signed list cover URLs
Timeline and Vault list responses SHALL issue a direct storage GET URL in `coverPhotoUrl` only after
authorizing the member, parent memory, selected attachment, and ready cover variant. URLs SHALL be
signed for 300 seconds from issuance, subject to earlier signing-credential expiry. Missing or
non-ready covers SHALL produce null. Buckets MUST remain private; responses MUST NOT include reusable
signing credentials or standalone object-key metadata. Previously issued URLs may remain usable until
effective expiry after access is revoked.

#### Scenario: Authorized list contains a ready cover
- **WHEN** an active member requests a list containing an eligible memory with a ready attached cover
- **THEN** its item contains a five-minute signed GET URL that the browser requests directly from
  storage without an application image endpoint

#### Scenario: Cover is absent or still processing
- **WHEN** an eligible memory has no selected cover or no ready cover variant
- **THEN** the item contains `coverPhotoUrl: null` and remains in the list

#### Scenario: Backend list query runs again
- **WHEN** a later authorized list request reaches the backend
- **THEN** the backend signs its ready cover URLs anew with expiration measured from that issuance

### Requirement: Read active-space memory detail
`GET /api/memories/timeline/:memoryId` and `GET /api/memories/vault/:memoryId` SHALL require a Better
Auth session and derive the member and active space server-side. Each SHALL return only an undeleted
new-backend memory with the route's visibility in an undeleted active space. Reads SHALL verify current
membership and SHALL NOT use Supabase or caller-supplied identity or space as authority.

#### Scenario: Active member reads detail
- **WHEN** an active member requests a matching Timeline or Vault memory
- **THEN** HTTP 200 returns the authorized memory in the standard success envelope

#### Scenario: Memory is unavailable
- **WHEN** membership is absent or the identifier is malformed, missing, deleted, inaccessible, in
  another space, or has the wrong route visibility
- **THEN** the same generic HTTP 404 contains no memory, creator, photo, or storage data

#### Scenario: Session is unavailable or a read fails
- **WHEN** a request has no valid session or the backend encounters an unexpected read failure
- **THEN** it returns 401 or a safe server error respectively, not a successful or generic-not-found
  detail

### Requirement: Memory detail response contract
Successful detail responses SHALL use shared `ApiResponse` and detail types. Data SHALL include id,
title, date-only memory date, nullable description and location, visibility, creation and update
timestamps, creator display name, nullable avatar, ordered photos, and bounded related summaries. Photo
URLs SHALL be nullable. `reaction` with the shared reaction summary SHALL be included. Comment, opaque mutation-version, and object-key fields SHALL NOT be included. `updatedAt` SHALL preserve full database timestamp precision for exact optimistic-lock round trips.

#### Scenario: Authorized detail has related memories
- **WHEN** an active member requests a matching memory with eligible neighbors
- **THEN** the response contains only same-space, same-visibility summaries, excluding the parent and
  social data, ordered by memory date, creation time, and ID descending and bounded by the existing
  related-card limit

#### Scenario: Detail has optional or no photo data
- **WHEN** description, location, avatar, photos, or a photo variant are absent
- **THEN** the response represents the missing values as null or an empty collection without
  fabricating content

### Requirement: Issue signed detail photo URLs
After authorizing the parent and attached file in the active space, the API SHALL sign only ready cover
and detail variants for 300 seconds from issuance, subject to earlier credential expiry. Missing or
non-ready variants SHALL be null. The API MUST NOT expose reusable signing credentials or standalone
storage keys. Related ready cover URLs use the same rules. Each fresh authorized read signs URLs anew.

#### Scenario: Authorized ready variants
- **WHEN** an authorized memory has ready attached variants
- **THEN** the response contains direct signed GET URLs for those variants and no raw object keys

#### Scenario: Variant unavailable or signing fails
- **WHEN** a variant is missing or not ready
- **THEN** its URL is null and the memory remains readable
- **WHEN** signing unexpectedly fails
- **THEN** the request returns a safe error instead of fabricating a URL

#### Scenario: Access changes after issuance
- **WHEN** membership is revoked or the memory is deleted after a URL is issued
- **THEN** later detail requests deny access, while that URL may remain usable until effective expiry

### Requirement: Document memory read operations
The local API reference SHALL document the Timeline and Vault list and detail operations, query
validation, schemas, authentication, cursor behavior, error envelopes, and signed URL expiry and
revocation limitations. It MUST NOT advertise a cover-bytes endpoint or new application image proxy.

#### Scenario: Developer inspects memory read endpoints
- **WHEN** a developer opens the local OpenAPI document or Scalar reference
- **THEN** both visibility-specific list and detail operations expose matching response and error
  contracts, including nullable signed cover URLs

### Requirement: Retire frontend-origin legacy memory writes

The frontend origin SHALL NOT serve legacy `POST /api/memories` or
`POST /api/memories/uploads` handlers after retirement. Clients SHALL use the existing current-backend
upload and memory-creation contracts. Retired paths MUST NOT redirect or proxy legacy payloads to
the current backend or accept Supabase sessions as current authentication.

#### Scenario: A legacy creation or upload request reaches the frontend
- **WHEN** a client posts to `/api/memories` or `/api/memories/uploads` on the frontend origin
- **THEN** no legacy application handler processes it and no database or storage write occurs

#### Scenario: A current client creates a memory
- **WHEN** an authorized client obtains uploads from `/api/files/uploads` and submits `/api/memories` on the configured backend origin
- **THEN** existing upload and creation contracts apply without a frontend-origin legacy handler

### Requirement: Legacy image endpoint boundary

Migrated Timeline, Vault, dashboard, detail, and editor previews SHALL use authorized signed storage
URLs from the current backend, not `/api/memories/:memoryId/photos/:photoId/:variant`. No replacement
application image proxy SHALL be introduced. The legacy photo route SHALL be removed and MUST NOT
serve bytes, redirect to storage, or fall back to Supabase.

#### Scenario: Migrated list or detail renders a cover
- **WHEN** a migrated list, dashboard, or detail renders an eligible ready photo
- **THEN** the browser requests its signed storage URL directly without a legacy or replacement image proxy

#### Scenario: Existing editor preview renders an image
- **WHEN** the migrated editor displays a retained photo
- **THEN** it uses the signed URL from its current-backend editor read, without querying Supabase

#### Scenario: A client requests a retired photo URL
- **WHEN** a client requests `/api/memories/:memoryId/photos/:photoId/:variant` on the frontend origin
- **THEN** no legacy photo handler serves image bytes, signs a replacement URL, or accesses Supabase

### Requirement: Read active-space memory reactions

`GET /api/memories/:memoryId/reactions` SHALL require a valid session and derive the caller's active
membership and space server-side. It SHALL return HTTP 200 with shared
`ApiResponse<MemoryReactionSummary>` for an undeleted Timeline or Vault memory in that active space.
Success SHALL include `ok: true`, the summary in `data`, `error: []`, and a message. The response
SHALL use `Cache-Control: no-store`.

#### Scenario: Member reads a reaction summary
- **WHEN** an active member requests reactions for an available Timeline or Vault memory in the
  active space
- **THEN** HTTP 200 returns counts and member-name lists for every supported type and the caller's
  nullable selection in the standard success envelope

#### Scenario: Authorized memory has no reactions
- **WHEN** an active member requests reactions for a memory with no current-backend reactions
- **THEN** HTTP 200 returns all four zero counts, empty member lists, and `currentReaction: null`

### Requirement: Toggle an active-space memory reaction

`POST /api/memories/:memoryId/reactions` SHALL accept only JSON `{ reactionType }`, with a required
type of `heart`, `laugh`, `cry`, or `star`. It SHALL require a valid session, derive ownership from
active membership, and atomically add, replace, or remove that member's reaction. HTTP 200 SHALL
return the resulting shared `ApiResponse<MemoryReactionSummary>` with `Cache-Control: no-store`.

#### Scenario: Member toggles a reaction
- **WHEN** an active member posts a supported reaction type for an available memory
- **THEN** HTTP 200 returns the committed transaction's summary with the member's new selection or
  null after removal

#### Scenario: Body validation fails
- **WHEN** a request contains malformed JSON, a missing or unsupported reaction type, or extra
  fields such as ownership or space identifiers
- **THEN** HTTP 400 returns the standard error envelope and no reaction is changed

### Requirement: Reaction endpoint failure boundaries

Both reaction endpoints SHALL return HTTP 401 for an invalid session and the same generic HTTP 404
for absent active membership or a malformed, missing, deleted, cross-space, or inaccessible memory.
Failures SHALL use shared `ApiResponse` with `ok: false`, `data: null`, errors, and a safe message.
Unexpected failures SHALL return a safe server error without counts, member names, internal details,
or a Supabase fallback.

#### Scenario: Session is unavailable
- **WHEN** a reaction read or toggle has no valid session
- **THEN** HTTP 401 exposes no memory or reaction data and persists no reaction

#### Scenario: Memory or membership is unavailable
- **WHEN** an authenticated reaction request has no active membership or targets a malformed,
  missing, deleted, cross-space, or inaccessible memory
- **THEN** the generic HTTP 404 exposes no reaction data or resource-existence details and persists
  no reaction

#### Scenario: Reaction storage fails unexpectedly
- **WHEN** an unexpected backend failure prevents a reaction read or toggle
- **THEN** the API returns a safe server error envelope rather than fabricated counts, a false
  not-found outcome, or a partial success

### Requirement: Document reaction operations

The local OpenAPI document and Scalar reference SHALL describe both reaction routes, session
authentication, the toggle body, HTTP 200 summaries, validation and authorization failures, and the
add/replace/remove semantics. Memory detail schemas and examples SHALL include the same shared
reaction summary shape.

#### Scenario: Developer inspects the reaction contract
- **WHEN** a developer opens the local API reference
- **THEN** the reaction operations and both detail response schemas describe matching fields,
  supported types, nullable selection, and standard envelopes

### Requirement: Memory comment operations

The API SHALL expose authenticated `GET` and `POST /api/memories/:memoryId/comments`, `PATCH` and
`DELETE /api/memories/:memoryId/comments/:commentId`, and
`GET /api/memories/:memoryId/comments/:commentId/replies`. It MUST use current-backend data, shared
response envelopes, session-derived membership, and non-enumerating authorization.

#### Scenario: Member reads or writes a comment
- **WHEN** an active member calls a comment endpoint for an available memory
- **THEN** the API applies comment validation and authorization and returns the documented shared response

#### Scenario: Session or resource is unavailable
- **WHEN** authentication is missing or a memory or comment is inaccessible
- **THEN** the API returns 401 for missing authentication or a generic 404 for an unavailable resource
  without exposing comment data

### Requirement: Comment page contract

Root and reply reads SHALL return a shared cursor-page response with nullable `nextCursor` and boolean
`resetCursor`. Cursors MUST preserve the full timestamp and ID ordering tuple, be validated, and never
grant authorization. Malformed cursors SHALL produce a safe 400; invalidated chains SHALL signal reset.

#### Scenario: Empty or final page
- **WHEN** no further eligible comments or replies exist
- **THEN** the API returns a successful page with `nextCursor: null` and `resetCursor: false`

#### Scenario: Cursor scope or anchor is invalidated
- **WHEN** a valid cursor no longer matches the requested authorized list or eligible anchor
- **THEN** the response signals reset without exposing protected data

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

### Requirement: Document comment operations

The local API reference SHALL describe all comment routes, session authorization, one-level replies,
pagination, deletion placeholders, locking, and error responses.

#### Scenario: Developer inspects the API reference
- **WHEN** a developer opens the local API documentation
- **THEN** the comment operations and request and response schemas reflect the implemented contract

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

### Requirement: Read an active-space memory for editing

`GET /api/memories/:memoryId/edit` SHALL authorize either active member and return the standard
response envelope with editable metadata, visibility, cover file ID, exact `updatedAt`, and all
attached root photo IDs in persisted position order with nullable signed preview URLs. The read
SHALL use `Cache-Control: no-store` and current-backend records only, independent of current placement.

#### Scenario: Editor requests prefilled values
- **WHEN** either active member requests an available Timeline or Vault memory
- **THEN** HTTP 200 returns editable state without detail-only cover-first sorting or editable creator/social fields

#### Scenario: Attached photo has no preview
- **WHEN** an attached file has no ready preview variant
- **THEN** its photo ID remains in the ordered collection and its preview URL is null

### Requirement: Save a memory edit

`PATCH /api/memories/:memoryId` SHALL accept only `title`, `description`, `location`, `memoryDate`,
`timezone`, `visibility`, `lastKnownUpdatedAt`, `retainedPhotoIds`, ordered `uploadIds`, and nullable
`coverFileId`. Required empty selections mean retain/add none. The request MUST NOT accept an edit
idempotency key. Responses SHALL use the standard envelope and `Cache-Control: no-store`.

#### Scenario: Metadata-only edit completes
- **WHEN** a valid metadata-only edit matches the current timestamp
- **THEN** HTTP 200 returns the advanced persisted token after commit without creating image events

#### Scenario: Photo edit completes before processing
- **WHEN** a valid edit retains A/C, removes B, and attaches new D while D is not ready
- **THEN** HTTP 200 reports the committed save and fresh reads show A/C normally with a nullable preview for D and no B

#### Scenario: Repeated save uses an old timestamp
- **WHEN** a request repeats a timestamp already consumed by a committed edit
- **THEN** HTTP 409 prevents another mutation without promising replay of the original successful result

### Requirement: Memory edit save completion

HTTP 200 SHALL return `{ id, visibility, updatedAt }` after metadata, final ordered associations,
cover, removals/file retirement, and new-photo events commit together. New photos SHALL process
after attachment as in creation. Success MUST mean persistence, not image readiness or queue
acceptance. No edit-status resource, 202 preparation response, or finalize/resume request SHALL be added.

#### Scenario: Save transaction commits
- **WHEN** all required edit writes commit while new image variants are pending
- **THEN** HTTP 200 returns the persisted advanced token without waiting for a second finalization request

#### Scenario: Post-commit publication fails
- **WHEN** the edit commits but bounded queue publication fails or is uncertain
- **THEN** the saved edit is not reported as rolled back, outbox failure evidence remains, and no second save is required to finalize it

### Requirement: Memory edit failure boundaries

Editor APIs SHALL return 401 without a session and the same generic 404 for absent membership or
malformed, missing, inactive, deleted, cross-space, or inaccessible targets. Saves SHALL use 400 for
invalid input, 409 for eligible stale edits or conflicting upload claims, and safe 5xx for unexpected
pre-commit failures. Failures MUST use shared envelopes without partial edits or Supabase fallback.

#### Scenario: Input or reference is invalid
- **WHEN** fields, timezone, future date, count, cover, duplicates, timestamp precision, or foreign retained/new-upload references fail validation
- **THEN** HTTP 400 identifies applicable fields without revealing foreign data or changing the memory

#### Scenario: Edit loses a lifecycle race
- **WHEN** another edit or placement commits first, or deletion makes the parent unavailable
- **THEN** Save returns 409 for a still-accessible stale target or generic 404 for an unavailable target

#### Scenario: Pre-commit persistence fails
- **WHEN** the transaction fails before commit
- **THEN** the ordinary safe error envelope claims no success and all related memory, file-state, association, and event writes roll back

#### Scenario: Image processing fails after commit
- **WHEN** a newly attached photo later fails actual content checks or processing
- **THEN** the existing photo-read contract returns unavailable variants without changing the committed save or retained photos

#### Scenario: Save response is lost
- **WHEN** the client cannot determine whether a save committed
- **THEN** recovery reloads the authorized current memory without an attempt lookup, automatic stale-token replacement, or blind replay

### Requirement: Document memory editor operations

The local API reference SHALL document the editor snapshot and single save operation with shared
schemas, authentication, strict inputs, exact timestamps, ten-photo/cover/order rules, 200 committed
save semantics, asynchronous per-photo readiness, safe errors, uncertain-response reload, and signed
URL expiry. It SHALL explicitly distinguish retained, added, and removed photos and state that no
historical edit-result replay or durable operation resource is provided.

#### Scenario: Developer inspects editor contracts
- **WHEN** a developer opens OpenAPI or Scalar locally
- **THEN** both editor operations describe matching schemas and applicable 200, 400, 401, 404, 409, and server-error behavior without staged-edit endpoints

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
