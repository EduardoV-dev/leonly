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
