## MODIFIED Requirements

### Requirement: Atomic active-space creation
The system SHALL allow an authenticated user without an active membership to create one active
space. The mutation MUST atomically create the space, its first active membership, a current invite,
and completed onboarding state, or create none of them. The creator attribute and membership role
MUST NOT grant authorization beyond active membership.

Creation inputs MUST include a space name, start date, and IANA timezone. The creator display name is
optional; when supplied, it MUST be trimmed and contain 2 to 100 characters. When omitted or blank,
the system SHALL use the authenticated user's trimmed account name when it contains 2 to 100
characters, falling back to `Leonly User` otherwise. The space name MUST be trimmed and contain 2 to
100 characters. The start date MUST be a real `YYYY-MM-DD` date no later than the current date in the
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
