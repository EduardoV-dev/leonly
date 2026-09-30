## MODIFIED Requirements

### Requirement: Atomic join-attempt rate limiting
The server SHALL track failed invite validation and redemption attempts per authenticated user in
Redis using fixed 10-minute windows. Each user's allowance SHALL be five failures per window. The
first five failures SHALL receive their applicable safe errors. Once the allowance is exhausted,
subsequent validation and redemption requests in that window MUST be rejected before code lookup or
membership mutation with HTTP `429` and `Too many join attempts. Try again in 10 minutes.`

`Retry-After` SHALL be the positive whole number of seconds until the current fixed window resets,
rounded up and clamped to at least one second. Rejected requests MUST NOT move that boundary or start
a separate 10-minute lock. Failures SHALL expire at the fixed window boundary, even if the last
failure was recent. A successful redemption SHALL clear the user's failure count after its database
transaction commits. Successful validation alone MUST NOT clear failures, and transient server
failures MUST NOT count. Validation and redemption MUST share the same attempt state and be serialized
with a Redis per-user mutex, including requests from concurrent sessions of that user.

#### Scenario: First five attempts fail
- **WHEN** an authenticated user accumulates up to five failed invite attempts in the current fixed window
- **THEN** each attempt receives its applicable safe error and is recorded atomically

#### Scenario: Allowance is exhausted
- **WHEN** the user makes another request after five failures in the current fixed window
- **THEN** the server returns `429`, the remaining fixed-window `Retry-After`, and the rate-limit message without code lookup

#### Scenario: Concurrent attempts reach the limit
- **WHEN** concurrent requests would cross the five-failure boundary
- **THEN** serialized rate-limit state permits no request to bypass the fixed-window failure allowance

#### Scenario: Request arrives before the window resets
- **WHEN** a request arrives after the allowance is exhausted but before the window resets
- **THEN** the server returns `429` with the rounded-up remaining seconds and does not extend the window

#### Scenario: Failure state resets
- **WHEN** redemption succeeds or the fixed window resets
- **THEN** the next failed request begins a fresh count for the current window

#### Scenario: Failures occur near a window boundary
- **WHEN** five failures exhaust the allowance shortly before the fixed window resets
- **THEN** requests are blocked only until that boundary, not for 10 minutes after the fifth or sixth request

### Requirement: Invite format and normalization
The system SHALL issue an eight-character invite code displayed as `XXX-XXXXX` and stored as eight
lowercase characters. The three-character prefix MUST come from the product prefix allowlist and the
five-character random suffix MUST use the unambiguous lowercase alphabet
`abcdefghjkmnpqrstuvwxyz23456789`. Code generation MUST use cryptographically secure randomness and
an active-code uniqueness constraint.

Frontend and backend SHALL use the shared invite-code contract in `@leonly/utils/invite-code`.
Invite input SHALL trim surrounding whitespace with `String.prototype.trim`, normalize letter case,
and accept an optional hyphen only between the third and fourth characters. The normalized input
MUST match the prefix allowlist and suffix alphabet with exactly five suffix characters. Validation
MUST reject malformed separators, incorrect lengths, and characters outside that normalized contract.
Input formatting MUST trim before applying its display-length limit so pasted surrounding whitespace
cannot remove valid code characters.

#### Scenario: Displayed code is entered
- **WHEN** a user enters a current code in either letter case with the optional expected hyphen
- **THEN** the system normalizes it to the stored lowercase eight-character representation

#### Scenario: Malformed code is entered
- **WHEN** a user enters a code outside the accepted format or alphabet
- **THEN** the system rejects it without looking up a space and records a failed join attempt

#### Scenario: Padded code is pasted
- **WHEN** a user pastes a current code with surrounding whitespace, including non-breaking spaces
- **THEN** the input preserves all eight code characters and the frontend and backend accept the same normalized code

### Requirement: Join input and atomic redemption
Redemption SHALL require an authenticated user and valid invite input. A supplied non-blank joining
display name MUST be trimmed to 2 through 100 characters. If omitted or blank, the joining member
SHALL use the authenticated user's trimmed account name when valid, or `Leonly User` otherwise. A
successful redemption MUST atomically create the second active membership, complete that member's
onboarding, and consume the invite in one database transaction. After that transaction commits, the
server SHALL clear the user's Redis failed-attempt state and return only the joined active-space
identifier needed for routing. Validation MUST NOT reserve the invite: eligibility SHALL be checked
again when redemption occurs.

#### Scenario: Eligible user redeems an invite
- **WHEN** an authenticated user without an active membership redeems a current invite
- **THEN** the second membership is committed, the invite is consumed, and the user is routed to the two-member dashboard

#### Scenario: Joining user omits a display name
- **WHEN** an eligible user redeems an invite without a name or with a blank name
- **THEN** their membership uses the valid trimmed account name or `Leonly User` if it is unavailable or invalid

#### Scenario: Redemption input is invalid
- **WHEN** the request shape or a supplied non-blank display name is invalid
- **THEN** the system rejects the request without membership or invite changes

#### Scenario: Invite changes after validation
- **WHEN** an invite expires, is consumed, or becomes unavailable between validation and redemption
- **THEN** redemption rejects it without creating a membership

### Requirement: Membership-aware product routing
After authentication and after successful create or join mutations, the system SHALL resolve the
user's active membership on the server using the identity that authorized the mutation. Join setup
SHALL use this same authenticated identity to decide whether the user is eligible to join, without
requiring a separate authentication session. A user without one SHALL enter create/join setup. A
creator SHALL see the invite interstitial with the current persisted invite before entering the
existing dashboard shell; a user with an active membership after setup completion SHALL enter the
dashboard shell with a one-member or two-member state derived from persisted active memberships.
Creation already marks the owner's onboarding complete; moving from the creator invite interstitial
to the dashboard MUST NOT require a second setup-completion mutation.

#### Scenario: User has no active membership
- **WHEN** post-login routing finds no active membership
- **THEN** the user is routed to create/join setup

#### Scenario: Join setup uses the authenticated identity
- **WHEN** a Better Auth user without active membership opens either join step
- **THEN** the join form is available without a second authentication session

#### Scenario: Join setup is unavailable to existing members
- **WHEN** a user with active membership opens either join step
- **THEN** the user is routed to their current space instead of seeing the join form

#### Scenario: Creator refreshes the invite page
- **WHEN** the creator opens or refreshes the invite interstitial after successful creation
- **THEN** the code shown and copied comes from the current persisted active space, not a fixed
  example or browser-only state

#### Scenario: Invite is unavailable
- **WHEN** the creator's persisted invite is absent or expired
- **THEN** the interstitial does not present that code as usable and offers a route to continue
  without submitting a new creation request

#### Scenario: Creator continues to the dashboard
- **WHEN** a creator with a completed owner membership continues from the invite interstitial
- **THEN** the dashboard shows that space's one-member waiting state without requiring an additional
  setup-completion request

#### Scenario: Space has one active member
- **WHEN** routing resolves an active space with one active member
- **THEN** the user is routed to the one-member dashboard shell

#### Scenario: Space has two active members
- **WHEN** routing resolves an active space with two active members
- **THEN** the user is routed to the two-member dashboard shell
