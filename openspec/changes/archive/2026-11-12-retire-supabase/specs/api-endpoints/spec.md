# Spec Delta

## ADDED Requirements

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

## MODIFIED Requirements

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
