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
the system SHALL use the authenticated user's trimmed account name when it contains 2 to 100
characters, falling back to `Leonly User` otherwise. The space name MUST be trimmed and contain 2 to 100
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
- **THEN** the owner membership uses the authenticated user's valid trimmed account name or
  `Leonly User` when that name is unavailable or invalid

#### Scenario: Concurrent creation requests
- **WHEN** the same eligible user submits concurrent valid creation requests
- **THEN** exactly one active membership and its space are committed

#### Scenario: Creation fails during setup
- **WHEN** the create request fails validation, authentication, conflict, or due to a transient error
- **THEN** the form stays recoverable without discarding entered values or opening the invite page

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

Frontend and backend SHALL use the shared invite-code contract in `@leonly/utils/invite-code`.
Invite input SHALL trim surrounding whitespace with `String.prototype.trim`, normalize letter case,
and accept an optional hyphen only between the third and fourth characters. The normalized input MUST
match the prefix allowlist and suffix alphabet with exactly five suffix characters. Validation MUST
reject malformed separators, incorrect lengths, and characters outside that normalized contract.
Input formatting MUST trim before applying its display-length limit so pasted surrounding whitespace
cannot remove valid code characters.

#### Scenario: Padded code is pasted
- **WHEN** a user pastes a current code with surrounding whitespace, including non-breaking spaces
- **THEN** the input preserves all eight code characters and the frontend and backend accept the same normalized code

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

### Requirement: Join input and atomic redemption
Redemption SHALL require an authenticated user, a valid invite input, and a joining display name
trimmed to 2 through 100 characters. A successful redemption MUST atomically create the second active
membership, complete that member's onboarding, and consume the invite in one database transaction.
After that transaction commits, the server SHALL clear the user's Redis failed-attempt state and
return only the joined active-space identifier needed for routing.

#### Scenario: Eligible user redeems an invite
- **WHEN** an authenticated user without an active membership submits a current invite and valid name
- **THEN** the second membership is committed and the user is routed to the two-member dashboard

#### Scenario: Redemption input is invalid
- **WHEN** the joining display name or request shape is invalid
- **THEN** the system rejects the request without membership or invite changes

### Requirement: Membership-aware product routing
After authentication and after successful create or join mutations, the system SHALL resolve the
user's active membership on the server using the identity that authorized the mutation. A user
without one SHALL enter create/join setup. A creator SHALL see the invite interstitial with the
current persisted invite before entering the existing dashboard shell; a user with an active
membership after setup completion SHALL enter the dashboard shell with a one-member or two-member
state derived from persisted active memberships. Creation already marks the owner's onboarding
complete; moving from the creator invite interstitial to the dashboard MUST NOT require a second
setup-completion mutation.

#### Scenario: User has no active membership
- **WHEN** post-login routing finds no active membership
- **THEN** the user is routed to create/join setup

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
