# Spec Delta

## ADDED Requirements

### Requirement: Read active-space memory reactions

`GET /api/memories/:memoryId/reactions` SHALL require a valid session and derive the caller's active membership and space server-side. It SHALL return HTTP 200 with shared `ApiResponse<MemoryReactionSummary>` for an undeleted Timeline or Vault memory in that active space. Success SHALL include `ok: true`, the summary in `data`, `error: []`, and a message. The response SHALL use `Cache-Control: no-store`.

#### Scenario: Member reads a reaction summary

- **WHEN** an active member requests reactions for an available Timeline or Vault memory in the active space
- **THEN** HTTP 200 returns counts and member-name lists for every supported type and the caller's nullable selection in the standard success envelope

#### Scenario: Authorized memory has no reactions

- **WHEN** an active member requests reactions for a memory with no current-backend reactions
- **THEN** HTTP 200 returns all four zero counts, empty member lists, and `currentReaction: null`

### Requirement: Toggle an active-space memory reaction

`POST /api/memories/:memoryId/reactions` SHALL accept only JSON `{ reactionType }`, with a required type of `heart`, `laugh`, `cry`, or `star`. It SHALL require a valid session, derive ownership from active membership, and atomically add, replace, or remove that member's reaction. HTTP 200 SHALL return the resulting shared `ApiResponse<MemoryReactionSummary>` with `Cache-Control: no-store`.

#### Scenario: Member toggles a reaction

- **WHEN** an active member posts a supported reaction type for an available memory
- **THEN** HTTP 200 returns the committed transaction's summary with the member's new selection or null after removal

#### Scenario: Body validation fails

- **WHEN** a request contains malformed JSON, a missing or unsupported reaction type, or extra fields such as ownership or space identifiers
- **THEN** HTTP 400 returns the standard error envelope and no reaction is changed

### Requirement: Reaction endpoint failure boundaries

Both reaction endpoints SHALL return HTTP 401 for an invalid session and the same generic HTTP 404 for absent active membership or a malformed, missing, deleted, cross-space, or inaccessible memory. Failures SHALL use shared `ApiResponse` with `ok: false`, `data: null`, errors, and a safe message. Unexpected failures SHALL return a safe server error without counts, member names, internal details, or a Supabase fallback.

#### Scenario: Session is unavailable

- **WHEN** a reaction read or toggle has no valid session
- **THEN** HTTP 401 exposes no memory or reaction data and persists no reaction

#### Scenario: Memory or membership is unavailable

- **WHEN** an authenticated reaction request has no active membership or targets a malformed, missing, deleted, cross-space, or inaccessible memory
- **THEN** the generic HTTP 404 exposes no reaction data or resource-existence details and persists no reaction

#### Scenario: Reaction storage fails unexpectedly

- **WHEN** an unexpected backend failure prevents a reaction read or toggle
- **THEN** the API returns a safe server error envelope rather than fabricated counts, a false not-found outcome, or a partial success

### Requirement: Document reaction operations

The local OpenAPI document and Scalar reference SHALL describe both reaction routes, session authentication, the toggle body, HTTP 200 summaries, validation and authorization failures, and the add/replace/remove semantics. Memory detail schemas and examples SHALL include the same shared reaction summary shape.

#### Scenario: Developer inspects the reaction contract

- **WHEN** a developer opens the local API reference
- **THEN** the reaction operations and both detail response schemas describe matching fields, supported types, nullable selection, and standard envelopes

## MODIFIED Requirements

### Requirement: Memory detail response contract

Successful detail responses SHALL use shared `ApiResponse` and detail types. Data SHALL include id, title, date-only memory date, nullable description and location, visibility, creation and update timestamps, creator display name, nullable avatar, ordered photos, bounded related summaries, and `reaction` with the shared reaction summary. Photo URLs SHALL be nullable. Comment, mutation-version, and object-key fields SHALL NOT be included.

#### Scenario: Authorized detail has related memories

- **WHEN** an active member requests a matching memory with eligible neighbors
- **THEN** the response contains the parent memory's reaction summary and only same-space, same-visibility related summaries, excluding the parent and social data on related cards, ordered by memory date, creation time, and ID descending and bounded by the existing related-card limit

#### Scenario: Detail has optional or no photo data

- **WHEN** description, location, avatar, photos, or a photo variant are absent
- **THEN** the response represents the missing values as null or an empty collection without fabricating content

#### Scenario: Detail has no reactions

- **WHEN** an authorized memory has no eligible current-backend reactions
- **THEN** its `reaction` field contains all four zero counts, empty member lists, and `currentReaction: null`

#### Scenario: Detail reaction lookup fails

- **WHEN** the backend cannot resolve the authorized memory's reaction summary
- **THEN** detail returns a safe failure rather than omitting the required field or fabricating an empty summary
