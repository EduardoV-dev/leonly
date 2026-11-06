## MODIFIED Requirements

### Requirement: Private cover-media delivery
The system SHALL authorize the parent memory and its ready cover attachment before issuing a direct storage GET URL signed for 300 seconds, subject to earlier credential expiry. Timeline cards and migrated detail views SHALL request signed URLs directly from private storage. Missing or unavailable covers MUST use an accessible fallback without changing memory eligibility or ordering. An issued URL may remain usable until its effective expiry after access is revoked or the memory is deleted; subsequent reads MUST NOT issue a fresh URL for an unavailable memory. Legacy media routes used by the editor retain their per-request authorization.

#### Scenario: Authorized cover photo is displayed
- **WHEN** an authorized Timeline or detail read finds a ready attached cover
- **THEN** the UI requests its short-lived signed URL directly from storage

#### Scenario: Cover photo is absent or delivery fails
- **WHEN** an authorized read has no ready cover or the signed URL cannot deliver the cover
- **THEN** the UI shows the accessible fallback without making storage public

#### Scenario: Unavailable memory includes a cover photo
- **WHEN** a later read cannot establish that a memory is available
- **THEN** it issues no fresh cover URL, although a previously issued URL may remain usable until expiry

### Requirement: Unavailable memory privacy
The system SHALL resolve memory detail through the authenticated NestJS active-space read and render the same generic not-found outcome for malformed, missing, soft-deleted, inaccessible, wrong-visibility, or other-space identifiers. No client-supplied space or user identifier can establish access. An available member MAY access a shared Private Vault memory through its Vault detail URL, but that access MUST NOT make the memory appear in the Timeline.

#### Scenario: Unavailable memory route is addressed
- **WHEN** a member addresses a malformed, missing, soft-deleted, inaccessible, wrong-visibility, or other-space identifier
- **THEN** the system renders the generic not-found outcome without disclosing record existence or lifecycle state

#### Scenario: Authorized Vault detail route is addressed
- **WHEN** an available member addresses an authorized shared Private Vault memory URL
- **THEN** the member can access that memory without it appearing in the Timeline
