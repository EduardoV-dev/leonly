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
