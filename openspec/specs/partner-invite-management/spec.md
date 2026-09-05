## Purpose

Enable the sole active member to understand, copy, and recover the active space invite while
preventing stale, unauthorized, or two-member states from exposing or changing invite access.

## Requirements

### Requirement: Membership-derived invite status
The system SHALL derive invite status from the authenticated member's active membership and current
active-space state, SHALL expose actionable invite data only while exactly one active member exists,
and SHALL accept no client-selected space or membership identifier for invite reads or regeneration.

#### Scenario: Sole active member has a valid invite
- **WHEN** an authenticated member is the only active member and the invite expires after the current
  server time
- **THEN** the system exposes the invite as valid with its code and expiry

#### Scenario: Sole active member has an expired invite
- **WHEN** an authenticated member is the only active member and the invite expires at or before the
  current server time
- **THEN** the system reports that the partner has not joined, exposes no copyable invite, and offers
  regeneration

#### Scenario: Sole active member has no invite
- **WHEN** an authenticated member is the only active member and no invite exists
- **THEN** the system reports that the partner has not joined, exposes no copyable invite, and offers
  regeneration

#### Scenario: Active space has two members
- **WHEN** the active space has two active members
- **THEN** the system reports joined status where invite status is shown and exposes no invite code or
  regeneration action

#### Scenario: Active membership is unavailable
- **WHEN** the requester has no active membership or the derived space or membership is missing,
  inactive, soft-deleted, or inaccessible
- **THEN** the system returns the generic not-found outcome without exposing invite, space, or member
  data

### Requirement: Dashboard-first invite status
The system SHALL render the complete invite-status section before every dashboard summary and action
while exactly one active member exists and SHALL omit the entire section once two active members
exist.

#### Scenario: One-member dashboard has a valid invite
- **WHEN** the sole active member opens the dashboard with a valid invite
- **THEN** the first dashboard content section displays the formatted code above a message that the
  partner has not joined and that the code remains valid

#### Scenario: One-member dashboard has no usable invite
- **WHEN** the sole active member opens the dashboard with a missing or expired invite
- **THEN** the first dashboard content section explains that the invite is unavailable and displays a
  regeneration action

#### Scenario: Partner joins while dashboard is stale
- **WHEN** regeneration or refresh observes that a second active member has joined
- **THEN** the dashboard exposes no invite code or regeneration action and removes the entire
  invite-status section on its next authoritative render

### Requirement: Normalized invite code contract
The system SHALL store and copy an eight-character lowercase invite code made from one approved
three-letter prefix followed by five characters from `abcdefghjkmnpqrstuvwxyz23456789`, SHALL compare
codes case-insensitively, and SHALL display valid codes in uppercase `XXX-XXXXX` form.

#### Scenario: Valid code is displayed and copied
- **WHEN** a valid normalized code is presented to the sole active member
- **THEN** the visible value uses uppercase `XXX-XXXXX` formatting and the copy action writes the
  lowercase eight-character value without the hyphen

#### Scenario: Formatted code is entered for redemption
- **WHEN** a user enters an otherwise valid code with surrounding ASCII whitespace, either letter
  case, and an optional hyphen after the prefix
- **THEN** the system trims the surrounding whitespace, lowercases the value, removes the optional
  hyphen, and validates the resulting normalized code

#### Scenario: Code contains excluded or misplaced characters
- **WHEN** an entered code has an unapproved prefix, wrong length, misplaced separator, or a character
  outside the normalized alphabet
- **THEN** the system rejects it as malformed without looking up an active space

### Requirement: Clipboard and manual copy behavior
The system SHALL provide an accessible copy action for a valid invite, announce its outcome without
color, and preserve the visible invite with a keyboard-usable manual-selection fallback when browser
copy is unavailable or fails.

#### Scenario: Clipboard copy succeeds
- **WHEN** the member activates copy and the Clipboard API writes the normalized code
- **THEN** the system announces copy success and leaves the formatted code visible

#### Scenario: Clipboard permission is denied
- **WHEN** the Clipboard API rejects the copy request
- **THEN** the system announces that automatic copy failed, leaves invite state unchanged, and moves
  predictable focus to or identifies a control that lets the member select the displayed code

#### Scenario: Clipboard API is unavailable
- **WHEN** the browser does not provide the required Clipboard API
- **THEN** the system provides the same announced manual-selection fallback without attempting to
  regenerate or hide the invite

### Requirement: Atomic invite regeneration
The system SHALL permit any authenticated sole active member to regenerate only a missing or expired
invite, SHALL authorize and derive the target space on the server, and SHALL atomically replace all
prior invite validity with one new code that expires 24 hours after issuance.

#### Scenario: Missing invite is regenerated
- **WHEN** the sole active member requests regeneration for a space with no invite
- **THEN** the system atomically issues one new invite and immediately returns its normalized code and
  expiry for display in the valid waiting state

#### Scenario: Expired invite is regenerated
- **WHEN** the sole active member requests regeneration at or after the invite expiry
- **THEN** the system atomically issues one new invite and the prior code remains unusable

#### Scenario: Existing invite is still valid
- **WHEN** regeneration is requested while the derived space has an unexpired invite
- **THEN** the system performs no mutation and returns a generic unavailable outcome without exposing
  invite data

#### Scenario: Second member wins a concurrent race
- **WHEN** a second member joins before a stale regeneration request acquires the authoritative space
  state
- **THEN** regeneration performs no mutation and returns the non-actionable joined or generic
  unavailable outcome without invite data

#### Scenario: Regeneration succeeds in the interface
- **WHEN** an eligible regeneration completes successfully
- **THEN** the unavailable state is replaced in place by the new formatted code, copy action, and valid
  waiting message without navigation or reauthentication

### Requirement: Invite regeneration rate limit
The system SHALL allow an authenticated member at most five regeneration requests in a rolling
10-minute window, SHALL atomically reject additional requests before invite lookup or mutation, and
SHALL not extend the window when rejecting an already limited request.

#### Scenario: Request is within the limit
- **WHEN** the member has made fewer than five regeneration requests during the preceding 10 minutes
- **THEN** the system evaluates the request against the current membership and invite state

#### Scenario: Sixth request exceeds the limit
- **WHEN** the member submits a sixth regeneration request within the rolling 10-minute window
- **THEN** the system returns HTTP `429`, a `Retry-After` header containing the remaining whole seconds,
  and `Too many invite requests. Try again in 10 minutes.` without reading or changing invite state

#### Scenario: Request arrives while limited
- **WHEN** the member sends another request before the current limit expires
- **THEN** the system returns HTTP `429` with the remaining duration and does not extend the limit

#### Scenario: Rate-limit window expires
- **WHEN** 10 minutes pass without a regeneration request from that member
- **THEN** the next request is evaluated normally against current membership and invite state

### Requirement: Accessible and responsive invite controls
The system SHALL give the code and every invite action an accessible name, keyboard operation,
visible focus, predictable post-action focus, and announced non-color feedback across supported mobile
and desktop viewports.

#### Scenario: Member manages an invite by keyboard
- **WHEN** a member reaches the invite section using only a keyboard
- **THEN** copy, manual selection, and regeneration are operable in logical order and focus remains on
  the initiating control or moves to the newly relevant result

#### Scenario: Regeneration completes or fails
- **WHEN** an initiated regeneration returns success, rate limiting, stale-state rejection, or an
  unexpected failure
- **THEN** the system announces the result, prevents duplicate submission while pending, and preserves
  an available recovery path without relying on color

#### Scenario: Invite section reflows on mobile
- **WHEN** the invite section is displayed on a supported narrow viewport
- **THEN** the code, status, and controls remain readable and operable without horizontal clipping or
  collision with fixed navigation and safe-area insets
