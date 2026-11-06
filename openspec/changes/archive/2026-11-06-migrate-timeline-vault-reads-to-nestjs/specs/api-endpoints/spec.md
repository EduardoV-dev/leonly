# Spec Delta

## ADDED Requirements

### Requirement: Read active-space memory lists
`GET /api/memories/timeline` and `GET /api/memories/vault` SHALL require a Better Auth session and derive the active space from its active membership. They SHALL read only new-backend records, exclude deleted memories and spaces, and return only the route's visibility. They MUST NOT query Supabase or accept caller-supplied user or space identifiers as authority.

#### Scenario: Member reads either list
- **WHEN** an active member requests the Timeline or Vault endpoint
- **THEN** HTTP 200 contains only eligible new-backend memories in that member's active space and the requested visibility

#### Scenario: Session or membership is unavailable
- **WHEN** the caller lacks a valid session or has no active membership in a non-deleted space
- **THEN** the API returns HTTP 401 or a generic HTTP 404 respectively, with the standard error envelope and no memory data

#### Scenario: Only legacy records exist
- **WHEN** Supabase contains memories but the new backend has no eligible memories
- **THEN** the endpoint returns a successful empty page without reading or importing the legacy records

### Requirement: Validate memory list query parameters
Both list endpoints SHALL accept optional `cursor` and `sort`, with `sort` limited to `newest` or `oldest` and defaulting to `newest`. Both SHALL accept integer `limit` from 1 through 20, defaulting to 10. Unsupported parameters, invalid limits or sorts, and malformed cursors SHALL return HTTP 400 in the standard error envelope.

#### Scenario: Dashboard requests a smaller page
- **WHEN** an authorized caller requests Timeline with `limit=4`
- **THEN** the response contains at most four eligible memories and correctly indicates whether another page exists

#### Scenario: Query validation fails
- **WHEN** a request supplies an invalid sort, an out-of-range or non-integer limit, unsupported parameters, or an invalid cursor encoding or shape
- **THEN** the API returns HTTP 400 without using the invalid values in a database predicate

### Requirement: Memory list response contract
Successful lists SHALL return the standard `ApiResponse` envelope whose `data` contains `data` (items) and `meta` (`nextCursor`, nullable, and `cursorReset`, boolean). Each item SHALL contain `id`, `title`, `memoryDate`, `createdAt`, nullable `description`, nullable `location`, and nullable `coverPhotoUrl`. Items MUST omit comment counts and reaction data; terminal and empty pages SHALL emit `nextCursor: null`.

#### Scenario: Page contains eligible items
- **WHEN** a list request succeeds
- **THEN** the API returns HTTP 200 with `ok: true`, `error: []`, a message, and the documented page and item fields without comments or reactions

#### Scenario: List lookup fails unexpectedly
- **WHEN** an unexpected database or application failure prevents listing
- **THEN** the API returns a generic HTTP 500 error envelope rather than an empty success or internal error details

### Requirement: Signed list cover URLs
Timeline and Vault list responses SHALL issue a direct storage GET URL in `coverPhotoUrl` only after authorizing the member, parent memory, selected attachment, and ready cover variant. URLs SHALL be signed for 300 seconds from issuance, subject to earlier signing-credential expiry. Missing or non-ready covers SHALL produce null. Buckets MUST remain private; responses MUST NOT include reusable signing credentials or standalone object-key metadata.

#### Scenario: Authorized list contains a ready cover
- **WHEN** an active member requests a list containing an eligible memory with a ready attached cover
- **THEN** its item contains a five-minute signed GET URL that the browser requests directly from storage without an application image endpoint

#### Scenario: Cover is absent or still processing
- **WHEN** an eligible memory has no selected cover or no ready cover variant
- **THEN** the item contains `coverPhotoUrl: null` and remains in the list

#### Scenario: Backend list query runs again
- **WHEN** a later authorized list request reaches the backend
- **THEN** the backend signs its ready cover URLs anew with expiration measured from that issuance

#### Scenario: Membership is revoked after URL issuance
- **WHEN** a member loses access after receiving a signed URL
- **THEN** subsequent list requests deny access while the previously issued URL can remain usable until its effective expiry

### Requirement: Legacy image endpoint boundary
Migrated Timeline, Vault, and dashboard recent-memory covers MUST NOT use `GET /api/memories/:memoryId/photos/:photoId/:variant`. This change SHALL NOT add a replacement NestJS image endpoint or Next.js image proxy. The legacy route SHALL remain available to existing detail-page, edit-preview, and related-memory consumers until their separate migrations.

#### Scenario: Migrated list renders a cover
- **WHEN** a Timeline, Vault, or dashboard recent-memory card renders its ready cover
- **THEN** the browser uses the signed URL from the list response and makes no request to the legacy image route or a new application image proxy

#### Scenario: Legacy consumer renders an image
- **WHEN** an existing detail page, edit preview, or related-memory card requests a legacy image
- **THEN** its current image route and authorization behavior remain available without a NestJS replacement

### Requirement: Document memory read operations
The API reference SHALL document both prefixed list operations, query validation, page/item schemas, authentication, stale-cursor resets, and error envelopes. It SHALL describe `coverPhotoUrl` as a nullable direct storage GET URL signed for five minutes, including its expiry and revocation limitations. It MUST NOT advertise a new backend cover-bytes endpoint.

#### Scenario: Developer opens the API reference
- **WHEN** a developer inspects the local OpenAPI document or Scalar reference
- **THEN** Timeline and Vault expose matching schemas and statuses and describe signed covers without a new cover operation
