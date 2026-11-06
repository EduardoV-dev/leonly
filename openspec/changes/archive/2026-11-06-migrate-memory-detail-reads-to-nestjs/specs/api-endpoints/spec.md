## ADDED Requirements

### Requirement: Read active-space memory detail
`GET /api/memories/timeline/:memoryId` and `GET /api/memories/vault/:memoryId` SHALL require a Better Auth session and derive the member and active space server-side. Each SHALL return only an undeleted new-backend memory with the route's visibility in an undeleted active space. Reads SHALL verify current membership and SHALL NOT use Supabase or caller-supplied identity or space as authority.

#### Scenario: Active member reads detail
- **WHEN** an active member requests a matching Timeline or Vault memory
- **THEN** HTTP 200 returns the authorized memory in the standard success envelope

#### Scenario: Memory is unavailable
- **WHEN** membership is absent or the identifier is malformed, missing, deleted, inaccessible, in another space, or has the wrong route visibility
- **THEN** the same generic HTTP 404 contains no memory, creator, photo, or storage data

#### Scenario: Session is unavailable or a read fails
- **WHEN** a request has no valid session or the backend encounters an unexpected read failure
- **THEN** it returns 401 or a safe server error respectively, not a successful or generic-not-found detail

### Requirement: Memory detail response contract
Successful detail responses SHALL use shared `ApiResponse` and detail types. Data SHALL include id, title, date-only memory date, nullable description and location, visibility, creation and update timestamps, creator display name, nullable avatar, ordered photos, and bounded related summaries. Photo URLs SHALL be nullable. Reaction, comment, mutation-version, and object-key fields SHALL NOT be included.

#### Scenario: Authorized detail has related memories
- **WHEN** an active member requests a matching memory with eligible neighbors
- **THEN** the response contains only same-space, same-visibility summaries, excluding the parent and social data, ordered by memory date, creation time, and ID descending and bounded by the existing related-card limit

#### Scenario: Parent is unavailable
- **WHEN** the requested parent is unavailable
- **THEN** no related summaries are returned

#### Scenario: Detail has optional or no photo data
- **WHEN** description, location, avatar, photos, or a photo variant are absent
- **THEN** the response represents the missing values as null or an empty collection without fabricating content

### Requirement: Issue signed detail photo URLs
After authorizing the parent and attached file in the active space, the API SHALL sign only ready cover and detail variants for 300 seconds from issuance, subject to earlier credential expiry. Missing or non-ready variants SHALL be null. The API MUST NOT expose reusable signing credentials or standalone storage keys. Related ready cover URLs use the same rules. Each fresh authorized read signs URLs anew.

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

### Requirement: Document detail read operations
The local API reference SHALL describe both prefixed detail operations, shared response fields, authentication, generic unavailable and failure statuses, nullable variants, and signed URL expiry and revocation limitations.

#### Scenario: Developer inspects detail endpoints
- **WHEN** a developer opens the local OpenAPI document or Scalar reference
- **THEN** both visibility-specific operations and their response and error contracts are documented
