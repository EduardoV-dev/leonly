## ADDED Requirements

### Requirement: Memory assets exclude staging lifecycle

`memory_assets` SHALL reference exactly one committed memory and a deterministic nonnegative position. `memory_asset_objects` SHALL represent only final originals and their variants, with one object per asset/variant pair and unique final paths. Upload issuance, promotion attempts, and unattached objects MUST be represented by `file_uploads`, not by nullable-memory staging assets. Asset-space and cover-memory integrity MUST be enforced.

#### Scenario: Upload is issued without a memory
- **WHEN** an upload record is created or an original is promoted before memory commit
- **THEN** no committed memory asset or memory asset object exists solely to represent that staging/finalization attempt

#### Scenario: Memory commits accepted images
- **WHEN** the memory transaction attaches uploads
- **THEN** every asset references that memory and its consumed upload, has a unique position, and owns an original plus pending cover/detail metadata

## MODIFIED Requirements

### Requirement: Persist memory lifecycle state

The system SHALL persist each memory with a UUID identifier, exactly one UUID owning space, creator membership and stable creator-user attribution compatible with the API identity model, content required by consumers, memory date, timestamps, nullable deletion timestamp, and visibility. It SHALL additionally persist its immutable creation key/hash. A null deletion timestamp means the memory is not deleted but MUST NOT imply variants are ready or deferred readers are implemented. Creator attribution MUST NOT independently grant access.

#### Scenario: Memory lifecycle data is stored
- **WHEN** a memory belongs to an existing space and valid creator membership
- **THEN** its content, ownership, lifecycle fields, and creation identity remain persistently addressable

#### Scenario: Creator is not an authorization authority
- **WHEN** the creator no longer has available membership and requests an operation
- **THEN** creator attribution alone does not authorize access

### Requirement: Protect private photo objects by available-memory membership

New creation photo objects SHALL reside in a private Cloudflare R2 bucket. Staging keys SHALL use `staging/memories/{spaceId}/{uploadId}/original`; final originals and variants SHALL use `memories/{spaceId}/{uploadId}/...`. Upload capability MUST be authorized by authenticated available membership and limited to its staging key. Final writes MUST remain server-controlled and actual final bytes MUST be validated before attachment. Every intended final copy SHALL be durably attributed to an upload record before copying. Public access and client-side storage credentials MUST NOT be available. New read/download endpoints, storage cleanup, and R2 lifecycle rules SHALL be deferred.

#### Scenario: Creation stages a prospective object
- **WHEN** an authenticated available member obtains a staging upload capability
- **THEN** it targets only the authorized staging key and an upload record exists before the client uploads

#### Scenario: Staged creation cannot complete
- **WHEN** an upload cannot commit a parent memory and asset records
- **THEN** its staging/final copies remain private and attributable without a cleanup-execution promise

#### Scenario: Staging URL is reused after promotion
- **WHEN** the client writes staging again after the final copy is accepted
- **THEN** the accepted final original and worker input do not change

### Requirement: Use UUID identifiers at application boundaries

The system SHALL use UUID identifiers for spaces, memberships, file uploads, memories, memory assets, object metadata, and outbox events. User references MUST retain the existing API authentication identity type rather than introduce a new user identity mapping for creation. Generic outbox aggregate IDs SHALL be capable of representing non-UUID identifiers. Supabase RPC identifier contracts SHALL NOT govern the new API creation endpoints.

#### Scenario: API receives memory-domain identifiers
- **WHEN** upload or memory creation receives upload, cover, or idempotency identifiers
- **THEN** those identifiers are validated as UUID strings while the user identity is derived from the existing authenticated session
