## ADDED Requirements

### Requirement: Validate a space invite
`POST /api/spaces/invite-validations` SHALL require an authenticated Better Auth session and accept JSON containing `invite_code`. The current user's identity SHALL come from the session, never from the request body. A usable invite SHALL return HTTP 200 with the standard success envelope and `data.valid: true`, without disclosing space or member data. Malformed codes SHALL return HTTP 400; unknown, expired, consumed, self-join, already-member, deleted, or full-space invites SHALL return the same generic HTTP 404 error. Missing authentication SHALL return HTTP 401. A user whose fixed-window failure allowance is exhausted SHALL receive HTTP 429 with a positive `Retry-After` header describing the time until the window resets and the join-rate-limit message in the standard error envelope. Unexpected failures SHALL use a generic HTTP 500 error without revealing invite state.

#### Scenario: Authenticated user validates a current invite
- **WHEN** an eligible user posts a usable invite code
- **THEN** the response contains `data.valid: true` without identifying the space or its members

#### Scenario: Invalid or unavailable invite is validated
- **WHEN** a user posts a malformed code or an invite that cannot be used
- **THEN** the API returns the applicable 400 or generic 404 error without space information

#### Scenario: Validation is unauthenticated or rate-limited
- **WHEN** the request has no valid session or the user has reached the join-attempt lock
- **THEN** the API returns 401 or 429 respectively, and a 429 includes the remaining `Retry-After` seconds

### Requirement: Redeem a space invite
`POST /api/spaces/memberships` SHALL require an authenticated Better Auth session and accept JSON containing `invite_code` and optional `display_name`. On success it SHALL return HTTP 200 with the standard success envelope and only `data.space_id` for routing. A malformed code or invalid supplied name SHALL return HTTP 400 (with `field: "display_name"` for a name error); unavailable invites SHALL return the same generic HTTP 404 error as validation. Missing authentication SHALL return HTTP 401, an exhausted fixed-window failure allowance SHALL return HTTP 429 with `Retry-After` until the window resets, and unexpected failures SHALL return a generic HTTP 500 error. These failures MUST NOT expose space or member data.

#### Scenario: Eligible user redeems an invite
- **WHEN** an authenticated user without a space posts a current invite and a valid or omitted name
- **THEN** the response contains only the joined `space_id` in the standard success envelope

#### Scenario: Invalid name or unavailable invite is redeemed
- **WHEN** the supplied name is invalid or the invite cannot be redeemed
- **THEN** the API returns a field-specific 400 or a generic 404 respectively without creating membership

#### Scenario: Redemption is unauthenticated or rate-limited
- **WHEN** the request has no valid session or the user has reached the join-attempt lock
- **THEN** the API returns 401 or 429 respectively, and a 429 includes the remaining `Retry-After` seconds
