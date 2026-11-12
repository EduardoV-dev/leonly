## MODIFIED Requirements

### Requirement: Preserve ordered photo metadata and cover integrity

Committed photos SHALL use same-space memory/file associations with unique per-memory positions and
exclusive root-file attachment. Cover SHALL reference an attachment of that memory or be null when
no photos remain. Availability SHALL inherit from the parent and file eligibility. Edits MUST
preserve retained identities and relative order, append new uploads in selection order, and commit
final associations/cover without waiting for new variants. Retained objects MUST NOT be rewritten.
Selecting an unready new cover MUST NOT silently change its identity or hide ready retained photos.

#### Scenario: Photos retain deterministic order
- **WHEN** committed photo associations are read
- **THEN** they have unique positions and deterministic persisted order

#### Scenario: Cover references another memory
- **WHEN** a cover points to a file not attached to that memory
- **THEN** persistence rejects the invalid relationship

#### Scenario: Edit changes the photo set
- **WHEN** Save removes B, retains A/C, and adds pending D
- **THEN** final A/C/D associations and selected cover commit together, B disappears immediately, A/C remain usable, and unrelated data is preserved

### Requirement: Protect private photo objects by available-memory membership

Current-backend photos SHALL remain in the configured private bucket under server-selected immutable
keys with durable file attribution before storage writes. Session-derived active-space membership
SHALL authorize uploads and new signed reads. Verified bytes SHALL be required for readiness, not
for committing a new photo association. Creation and editing SHALL share exclusive attachment
claims; unconsumed uploads remain separate from committed associations. Physical cleanup and bucket
lifecycle rules remain deferred.

#### Scenario: Available member reads a cover object
- **WHEN** an active member reads an eligible current-backend photo
- **THEN** the authorized read signs only its recorded ready variant

#### Scenario: Object belongs to an unavailable or other-space memory
- **WHEN** a fresh read targets a deleted, unauthorized, other-space, or detached photo
- **THEN** no new URL or parent/storage metadata is returned

#### Scenario: Creation stages a prospective object
- **WHEN** an authenticated member obtains an upload capability
- **THEN** its immutable server-selected object has a durable file record before upload

#### Scenario: Staged creation cannot complete
- **WHEN** an upload cannot commit a parent memory association
- **THEN** its objects remain private and attributed without a cleanup-execution promise

#### Scenario: Staging URL is reused after promotion
- **WHEN** a client reuses an upload capability after its immutable key already exists
- **THEN** the accepted original and worker input cannot be overwritten

#### Scenario: Edit attaches an unready addition
- **WHEN** Save commits a newly added photo before variants finish
- **THEN** its association is current but only verified ready variants can receive signed URLs and other variants remain nullable

### Requirement: Resolve private cover previews on the server

Current-backend readers SHALL authorize the member, parent, attachment, and ready variant before
issuing a direct storage GET URL for 300 seconds, subject to earlier credential expiry. URLs MUST NOT
be persisted as memory metadata or accepted as mutation authority. Standalone object keys and reusable
credentials MUST NOT be exposed. Earlier URLs can remain usable until effective expiry after removal
or access revocation. Pending/failed new variants MUST NOT prevent signing eligible retained variants.

#### Scenario: Authorized memory receives a preview URL
- **WHEN** an active member resolves a ready attached preview
- **THEN** the response contains a signed GET URL derived from recorded storage metadata

#### Scenario: Unavailable memory requests a preview URL
- **WHEN** a request targets a missing, deleted, cross-space, or unauthorized memory
- **THEN** generic unavailable returns no new preview or storage metadata

#### Scenario: Existing URL outlives authorization
- **WHEN** a photo is detached or membership is revoked after issuance
- **THEN** fresh reads deny that preview while the earlier capability can remain usable until effective expiry

### Requirement: Memory assets exclude staging lifecycle

Committed photo associations SHALL represent the selection saved on a committed memory, independently
of image-processing readiness. Issuance/upload alone SHALL NOT attach a file. Save SHALL attach
accepted new originals directly without an edit-attempt or reservation model. Same-space identity,
exclusive attachment, unique ordered positions, and cover membership MUST remain enforced. Explicit
removal SHALL detach and retire the file family in the same transaction; no old-to-new delayed swap
or automatic restoration after processing failure SHALL be introduced.

#### Scenario: Upload is issued without a memory
- **WHEN** issuance creates a file before a memory save
- **THEN** no committed association is created merely to represent staging

#### Scenario: Memory commits accepted images
- **WHEN** creation or editing commits accepted new originals
- **THEN** each association identifies its memory and file with a unique position while variant readiness remains independent

#### Scenario: Edit addition fails after a removal commits
- **WHEN** an added photo fails processing after Save already removed an old photo
- **THEN** the committed selection remains current with a fallback for the failed addition and the removed family remains non-serving and attributed
