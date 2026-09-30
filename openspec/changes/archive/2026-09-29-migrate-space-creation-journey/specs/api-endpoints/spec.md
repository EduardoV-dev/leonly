## ADDED Requirements

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
