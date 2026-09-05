## Purpose

Provide each active member with one secure, understandable settings view for the active shared space,
their membership-owned preferences, account context, and related destinations.

## Requirements

### Requirement: Active-space settings access
The system SHALL make Settings available only to an authenticated user with an active membership and
SHALL derive the displayed space from that server-verified membership rather than a client-supplied
space or member identifier.

#### Scenario: Active member opens Settings
- **WHEN** an authenticated user with an active membership opens Settings
- **THEN** the system displays settings for that membership's active space

#### Scenario: User has no active membership
- **WHEN** an authenticated user without an active membership attempts to open Settings
- **THEN** the system redirects the user to the space setup flow

#### Scenario: Unauthenticated user opens Settings
- **WHEN** an unauthenticated user attempts to open Settings
- **THEN** the system redirects the user to authentication

#### Scenario: Altered or inaccessible space request
- **WHEN** a request attempts to select an inactive, missing, or other user's space or membership
- **THEN** the system exposes no protected settings data and uses the generic not-found outcome for
  any direct resource route

### Requirement: Shared-space summary
The system SHALL identify settings owned by both members and SHALL display the active space name and
date-only start date without converting the stored date through a timezone.

#### Scenario: Shared values are available
- **WHEN** Settings loads an active space with a name and start date
- **THEN** the system presents both values in a section identified as shared by the space members

#### Scenario: Shared action extensions are not implemented yet
- **WHEN** the read-only US-015 view renders the shared values
- **THEN** the layout preserves understandable regions for future name and start-date actions without
  rendering misleading or inoperable controls

### Requirement: Membership state and active members
The system SHALL display every active member with a display name, a joined date, an avatar or safe
fallback, and a textual active status, and SHALL identify the current member without relying on
ordering or display-name uniqueness.

#### Scenario: One-member space
- **WHEN** exactly one active membership exists
- **THEN** the system identifies the current member, states that the partner has not joined, and shows
  the invite-status extension region

#### Scenario: Two-member space
- **WHEN** two active memberships exist
- **THEN** the system displays both active members, states that both members have joined, and exposes
  no actionable invite code

#### Scenario: Member avatar is missing
- **WHEN** an active member has no usable avatar
- **THEN** the system displays a non-blocking fallback that still identifies that member

#### Scenario: Invite data is missing
- **WHEN** a one-member space has missing or unavailable optional invite data
- **THEN** the system states that the invite is unavailable without blocking the remaining settings

### Requirement: Current-member settings ownership
The system SHALL present the authenticated member's membership display name separately from shared
settings and SHALL clearly state that the value belongs only to the current member.

#### Scenario: Current member views personal settings
- **WHEN** Settings loads successfully
- **THEN** the system displays the current membership display name in a personal-settings section and
  does not present the partner's display name as editable by the current member

#### Scenario: Personal action extensions are not implemented yet
- **WHEN** the read-only US-015 view renders personal settings
- **THEN** the layout preserves understandable regions for future display-name and language controls
  without implying that either control is currently available

### Requirement: Privacy-limited account context
The system SHALL display only the authenticated account's email and sign-in provider when available,
SHALL use neutral fallbacks when either field is absent, and SHALL not expose internal account IDs,
tokens, provider metadata, or another member's account identity.

#### Scenario: Account identity is available
- **WHEN** the authenticated account has an email and known sign-in provider
- **THEN** the system displays those fields as read-only account context

#### Scenario: Optional account identity is unavailable
- **WHEN** the email or sign-in provider is absent
- **THEN** the system displays a neutral unavailable value and keeps the rest of Settings usable

#### Scenario: Member signs out
- **WHEN** the member activates the separately presented sign-out action
- **THEN** the system ends the current authenticated session and returns the user to authentication

### Requirement: Private Vault navigation
The system SHALL provide a clearly named link to the active space's Private Vault and SHALL explain
that Vault content is shared by both active members while remaining outside the public Timeline.

#### Scenario: Member opens Private Vault from Settings
- **WHEN** the member activates the Private Vault link
- **THEN** the system navigates to the existing Private Vault destination without exposing Vault
  contents in Settings or implying that either active member is excluded

### Requirement: Settings loading and failure states
The system SHALL provide understandable loading and recoverable failed-read states without rendering
stale, partial, or cross-space settings as a successful result.

#### Scenario: Settings is loading
- **WHEN** the settings read has not completed
- **THEN** the system presents a labelled loading state that preserves the page's structural hierarchy

#### Scenario: Settings read fails
- **WHEN** the active-space settings read fails unexpectedly
- **THEN** the system presents a generic error with a retry action and does not expose implementation
  details or previously loaded protected values

### Requirement: Responsive and accessible settings presentation
The system SHALL preserve semantic heading order, labelled values and actions, keyboard operation,
visible focus, logical source order, and non-color status text across supported mobile and desktop
layouts.

#### Scenario: Keyboard and assistive-technology use
- **WHEN** a member navigates Settings with a keyboard or assistive technology
- **THEN** every link and action has an accessible name, predictable focus behavior, and status meaning
  available without color or hover

#### Scenario: Settings reflows on a narrow viewport
- **WHEN** Settings is displayed on a supported mobile viewport
- **THEN** sections stack in logical reading order, essential content remains visible, and controls do
  not collide with the fixed mobile navigation or safe-area inset

#### Scenario: Settings uses the desktop application shell
- **WHEN** Settings is displayed at the desktop breakpoint
- **THEN** the system marks Settings as the active shell destination and presents the editorial
  settings content beside the persistent sidebar
