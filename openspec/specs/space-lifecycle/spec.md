# Space Lifecycle Specification

## Purpose
Define active-space creation, membership capacity, invite lifecycle, join throttling, and
membership-aware routing requirements.

## Requirements

### Requirement: Atomic active-space creation
The system SHALL allow an authenticated user without an active membership to create one active
space. The mutation MUST atomically create the space, its first active membership, a current invite,
and completed onboarding state, or create none of them. The creator attribute and membership role
MUST NOT grant authorization beyond active membership.

Creation inputs MUST include a space name, start date, and IANA timezone. The creator display name is
optional; when supplied, it MUST be trimmed and contain 2 to 100 characters. When omitted or blank,
the system SHALL use the authenticated user's synchronized provider name, falling back to `Leonly
User` when that name is unavailable or invalid. The space name MUST be trimmed and contain 2 to 100
characters. The start date MUST be a real `YYYY-MM-DD` date no later than the current date in the
submitted valid timezone.

#### Scenario: Eligible user creates a space
- **WHEN** an authenticated user without an active membership submits valid creation inputs
- **THEN** the system atomically creates the active space and first active membership, issues an
  invite expiring 24 hours later, marks onboarding complete, and routes the user to the invite
  interstitial before the dashboard

#### Scenario: Ineligible or invalid creation
- **WHEN** creation input is invalid or the user already has an active membership
- **THEN** the system rejects creation without creating a space, membership, or invite

#### Scenario: Creator omits a display name
- **WHEN** an eligible user submits valid creation inputs without a display name
- **THEN** the owner membership uses the user's synchronized provider name or the safe fallback

#### Scenario: Concurrent creation requests
- **WHEN** the same eligible user submits concurrent valid creation requests
- **THEN** exactly one active membership and its space are committed

### Requirement: Active membership capacity
The database SHALL enforce at most one active membership per user and at most two active members per
active space. These invariants MUST hold independently of application checks and under concurrent
mutations.

#### Scenario: User already belongs to an active space
- **WHEN** a user with an active membership attempts to create or join another active space
- **THEN** the mutation is rejected and no additional active membership is created

#### Scenario: Final slot is redeemed concurrently
- **WHEN** multiple eligible users concurrently redeem the invite for the same final membership slot
- **THEN** exactly one user joins and every other mutation leaves membership and invite state unchanged

### Requirement: Invite format and normalization
The system SHALL issue an eight-character invite code displayed as `XXX-XXXXX` and stored as eight
lowercase characters. The three-character prefix MUST come from the product prefix allowlist and the
five-character random suffix MUST use the unambiguous lowercase alphabet
`abcdefghjkmnpqrstuvwxyz23456789`. Code generation MUST use cryptographically secure randomness and
an active-code uniqueness constraint.

Invite input SHALL be case-insensitive, trim surrounding ASCII whitespace, and accept the hyphen only
between the third and fourth characters. It MUST reject missing characters, ambiguous characters,
non-ASCII characters, and punctuation in any other position.

#### Scenario: Displayed code is entered
- **WHEN** a user enters a current code in either letter case with the optional expected hyphen
- **THEN** the system normalizes it to the stored lowercase eight-character representation

#### Scenario: Malformed code is entered
- **WHEN** a user enters a code outside the accepted format or alphabet
- **THEN** the system rejects it without looking up a space and records a failed join attempt

### Requirement: Invite expiry, consumption, and regeneration
An invite SHALL be valid only before its expiry instant, while its space is active and not deleted,
and while the space has exactly one active member. Expiry MUST occur exactly 24 hours after issue;
the invite is invalid when the current time equals or exceeds that instant. Successful redemption
MUST consume the invite in the same transaction as membership creation.

The sole active member SHALL be able to regenerate a missing or expired invite. Regeneration MUST
lock the space, issue a new 24-hour code, and invalidate every prior code for that space atomically.
It MUST reject regeneration for a current invite or a space without exactly one active member.

#### Scenario: Invite reaches its expiry boundary
- **WHEN** redemption occurs at or after the invite's expiry instant
- **THEN** the system rejects it without creating a membership

#### Scenario: Invite is redeemed successfully
- **WHEN** an eligible user redeems a current invite before expiry
- **THEN** membership creation and invite consumption commit atomically and the code cannot be reused

#### Scenario: Sole member regenerates an unavailable invite
- **WHEN** the sole active member requests regeneration for a missing or expired invite
- **THEN** a new invite is issued and all earlier codes remain unusable

#### Scenario: Unauthorized regeneration
- **WHEN** a non-member requests regeneration or the space does not have exactly one active member
- **THEN** the system returns a generic not-found outcome without changing the invite

### Requirement: Safe invite rejection
The system SHALL reject self-join, duplicate join, existing-active-space, unknown-code, expired-code,
consumed-code, inactive-space, deleted-space, and full-space attempts without creating a membership.
After syntactic input validation, these outcomes MUST return the generic message
`This invite is invalid or unavailable.` and MUST NOT disclose a space name, member identity,
membership count, lifecycle state, or whether a code ever existed.

#### Scenario: Semantically invalid invite is submitted
- **WHEN** an authenticated user submits a well-formed code that cannot be redeemed for any reason
- **THEN** the system returns the generic invite error with no active-space or member data

#### Scenario: User attempts self-join or duplicate join
- **WHEN** an active member submits their own space's code or attempts to join the same space again
- **THEN** the system creates no membership and returns no information about that space

#### Scenario: Unexpected server failure occurs
- **WHEN** invite processing fails for a transient or unexpected server reason
- **THEN** the system returns a generic retryable server error and does not record a failed join attempt

### Requirement: Atomic join-attempt rate limiting
The server SHALL atomically track failed invite validation and redemption attempts per authenticated
user. The first five failures in a rolling 10-minute window SHALL receive their applicable safe
error. A sixth request while those failures remain in the window MUST start a 10-minute lock and be
rejected before code lookup or membership mutation with HTTP `429`, `Retry-After: 600`, and
`Too many join attempts. Try again in 10 minutes.`

Requests during a lock MUST NOT extend it and SHALL return `Retry-After` as the positive whole number
of seconds remaining, rounded up. A successful redemption or a 10-minute period without a failed
attempt MUST clear the failure count. Successful validation alone MUST NOT clear failures, and
transient server failures MUST NOT count.

#### Scenario: First five attempts fail
- **WHEN** an authenticated user accumulates up to five failed invite attempts within 10 minutes
- **THEN** each attempt receives its applicable safe error and is recorded atomically

#### Scenario: Sixth request begins lock
- **WHEN** the user makes another request while five failures remain in the rolling window
- **THEN** the server starts the lock and returns the exact `429`, header, and message without code lookup

#### Scenario: Concurrent attempts reach the limit
- **WHEN** concurrent requests would cross the five-failure boundary
- **THEN** serialized rate-limit state permits no request to bypass the lock threshold

#### Scenario: Request arrives during lock
- **WHEN** a request arrives before the user's lock expires
- **THEN** the server returns `429` with the rounded-up remaining seconds and does not extend the lock

#### Scenario: Failure state resets
- **WHEN** redemption succeeds or no failed attempt remains within the last 10 minutes
- **THEN** the next failed request is treated as the first failure in a new window

### Requirement: Join input and atomic redemption
Redemption SHALL require an authenticated user, a valid invite input, and a joining display name
trimmed to 2 through 100 characters. A successful redemption MUST atomically create the second active
membership, complete that member's onboarding, consume the invite, clear their failed-attempt state,
and return only the joined active-space identifier needed for routing.

#### Scenario: Eligible user redeems an invite
- **WHEN** an authenticated user without an active membership submits a current invite and valid name
- **THEN** the second membership is committed and the user is routed to the two-member dashboard

#### Scenario: Redemption input is invalid
- **WHEN** the joining display name or request shape is invalid
- **THEN** the system rejects the request without membership or invite changes

### Requirement: Membership-aware product routing
After authentication and after successful create or join mutations, the system SHALL resolve the
user's active membership on the server. A user without one SHALL enter create/join setup. A creator
SHALL see the invite interstitial before entering the existing dashboard shell; a user with an active
membership after setup completion SHALL enter the dashboard shell with a one-member or two-member
state derived from persisted active memberships.

#### Scenario: User has no active membership
- **WHEN** post-login routing finds no active membership
- **THEN** the user is routed to create/join setup

#### Scenario: Space has one active member
- **WHEN** routing resolves an active space with one active member
- **THEN** the user is routed to the one-member dashboard shell

#### Scenario: Space has two active members
- **WHEN** routing resolves an active space with two active members
- **THEN** the user is routed to the two-member dashboard shell

### Requirement: Inactive and deleted space exclusion
Product creation, invite lookup, redemption, regeneration, active-space resolution, and dashboard
access MUST exclude inactive and soft-deleted spaces. A space addressed by identifier that is
inactive, deleted, inaccessible, or absent SHALL use the same generic not-found outcome.

#### Scenario: Inactive or deleted space is addressed
- **WHEN** a product route or mutation addresses an inactive or soft-deleted space
- **THEN** the system returns the generic not-found outcome without exposing its state or data

#### Scenario: Active membership lookup encounters unavailable space
- **WHEN** a membership references an inactive or soft-deleted space
- **THEN** post-login routing treats the user as having no enterable active space
