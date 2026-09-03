## MODIFIED Requirements

### Requirement: Resolve private cover previews on the server
The system SHALL expose a same-origin cover-photo media URL only after a server-side resolver establishes
that the requested memory is available to the authenticated requester. Every request to that media URL MUST
reauthorize the parent memory before returning bytes, MUST use server-owned persisted object metadata, and
MUST NOT expose or accept an object path, redirect, signed Storage credential, or client-supplied identity as
authority. Missing, deleted, other-space, and unauthorized memories MUST return the same generic unavailable
outcome, and media URLs MUST NOT be persisted as memory metadata.

#### Scenario: Authorized memory receives a preview URL
- GIVEN an authenticated user resolves an available memory with a cover photo
- WHEN the server resolves its cover preview
- THEN it returns an opaque same-origin media URL whose requests reauthorize that memory before returning
  photo bytes

#### Scenario: Unavailable memory requests a preview URL
- GIVEN a request targets a missing, deleted, other-space, or unauthorized memory
- WHEN the server resolves or serves its cover preview
- THEN it returns the generic unavailable outcome without returning photo bytes, Storage credentials, or
  object metadata
