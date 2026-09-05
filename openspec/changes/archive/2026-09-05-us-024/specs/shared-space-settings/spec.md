## MODIFIED Requirements

### Requirement: Membership state and active members
The system SHALL display every active member with a display name, a joined date, an avatar or safe
fallback, and a textual active status, SHALL identify the current member without relying on ordering
or display-name uniqueness, and SHALL present invite management appropriate to the current active
membership count.

#### Scenario: One-member space has a valid invite
- **WHEN** exactly one active membership exists and its invite is valid
- **THEN** the system identifies the current member, states that the partner has not joined, and shows
  the formatted invite code with its copy action in the invite-status region

#### Scenario: One-member space has no usable invite
- **WHEN** exactly one active membership exists and its invite is missing or expired
- **THEN** the system identifies the current member, states that the partner has not joined and the
  invite is unavailable, and shows an authorized regeneration action in the invite-status region

#### Scenario: Invite is regenerated from Settings
- **WHEN** eligible regeneration succeeds in the one-member Settings view
- **THEN** the invite-status region immediately displays the new formatted code, copy action, and valid
  waiting status without navigation or reauthentication

#### Scenario: Two-member space
- **WHEN** two active memberships exist
- **THEN** the system displays both active members, states that both members have joined, and exposes
  no actionable invite code or regeneration action

#### Scenario: Member avatar is missing
- **WHEN** an active member has no usable avatar
- **THEN** the system displays a non-blocking fallback that still identifies that member
