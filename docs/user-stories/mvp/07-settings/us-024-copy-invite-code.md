# US-024: Copy Invite Code

**Priority:** Should<br>
**Depends on:** US-020, US-025

## User Story

As the sole active member of an active space, I want to copy its current invite code so I can invite
one partner or friend without exposing private space data.

## Intended Outcome

While one active membership exists, that member can view and copy the current unexpired invite and
regenerate a missing or expired invite. Once a second active member joins, settings show joined status
instead of an actionable code.

## Scope

- Invite status, presentation formatting, copy action, clipboard success and failure, and regeneration
  for missing or expired codes.
- One-member and two-member active-space states on settings.

## Business Rules

- Display formatting is presentation-only. Clipboard copy uses the normalized value, and redemption
  normalizes manually entered formatted or unformatted codes before validation.
- A code expires 24 hours after issue and becomes invalid when the second active member joins.
- Only the sole active member may regenerate an expired or missing code; regeneration atomically
  invalidates every prior code for the space.
- A two-member active space shows joined status and does not return or render an actionable invite.
- Server authorization and RLS derive the active space from membership. Missing, inactive, and
  inaccessible spaces return the generic not-found outcome.
- Clipboard failure does not change invite state and provides an alternative that lets the member
  select the displayed code manually.
- The code and actions have accessible names, work by keyboard, preserve predictable focus, and
  announce copy and regeneration results without relying on color.

## Acceptance Criteria

- The sole active member can view a formatted unexpired code and copy its normalized value on
  supported devices.
- Copy success is announced; clipboard failure leaves the invite unchanged and permits manual copying.
- A missing or expired code offers authorized regeneration, which invalidates the prior code.
- A two-member active space exposes no actionable invite code or regeneration action.
- Inactive-member, cross-space, stale-page, and altered-space requests cannot read or regenerate an invite.
- The component remains usable by keyboard and on supported mobile viewports.

## Decision Required

- Define the invite code's normalized alphabet, length, case sensitivity, presentation format, and
  input-normalization rules shared with US-027.
- Define regeneration and redemption rate limits, including the user-visible response when limited.

## Verification Notes

- Test copy success, denied clipboard permission, unavailable clipboard API, and manual-copy fallback.
- Test 24-hour expiry boundaries, missing-code regeneration, prior-code invalidation, and stale pages.
- Test one-member, concurrent second-member join, two-member, inactive-space, and cross-space states.
- Test keyboard operation, focus, accessible naming, mobile layout, and announced feedback.
