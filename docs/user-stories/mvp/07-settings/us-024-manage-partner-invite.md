# US-024: Manage Partner Invite

**Priority:** Must<br>
**Depends on:** US-001, US-015

## User Story

As the sole active member of an active space, I want to see and manage its current invite so I always
know whether my partner can still join.

## Intended Outcome

While one active membership exists, the dashboard and settings always show invite status. A valid
code remains visible with waiting copy; an expired or missing code shows an explanation and a
regenerate action. Once a second active member joins, the dashboard section disappears and settings
show joined status instead of an actionable code.

## Scope

- A reusable invite-status section for the dashboard and settings.
- Invite presentation, copy action, clipboard success and failure, and regeneration for missing or
  expired codes.
- One-member and two-member active-space states.

## Business Rules

- Display formatting is presentation-only. Clipboard copy uses the normalized value, and redemption
  normalizes manually entered formatted or unformatted codes before validation.
- A code expires 24 hours after issue and becomes invalid when the second active member joins.
- Only the sole active member may regenerate an expired or missing code; regeneration atomically
  invalidates every prior code for the space.
- A two-member active space shows joined status and does not return or render an actionable invite.
- In a one-member space, the invite-status section is always rendered above all dashboard content.
- A valid invite keeps its formatted code visible at the top of the section and states that the
  partner has not joined and the code remains valid.
- An expired or missing invite states that the partner has not joined and the code is unavailable,
  then offers a regenerate button. Successful regeneration replaces that state with the new visible
  valid code and waiting message without requiring navigation or login.
- When the second active member joins, the dashboard omits the entire invite-status section.
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
- A one-member dashboard always shows the invite section before every dashboard summary or action.
- A valid code remains visible at the top of that section with a message that the partner has not
  joined; an expired or missing code shows expiry or unavailability and a regenerate button.
- Successful regeneration displays the new code and valid waiting state immediately. The section is
  absent after the second member joins.
- Inactive-member, cross-space, stale-page, and altered-space requests cannot read or regenerate an invite.
- The component remains usable by keyboard and on supported mobile viewports.

## Decision Required

- Define the invite code's normalized alphabet, length, case sensitivity, presentation format, and
  input-normalization rules shared with US-001.
- Define a regeneration rate limit and its user-visible response. US-001 defines redemption limiting.

## Verification Notes

- Test copy success, denied clipboard permission, unavailable clipboard API, and manual-copy fallback.
- Test 24-hour expiry boundaries, missing-code regeneration, prior-code invalidation, and stale pages.
- Test one-member, concurrent second-member join, two-member, inactive-space, and cross-space states.
- Test dashboard-first placement, valid waiting copy, expired and missing states, regeneration to a
  visible valid code, refresh persistence, and section removal after the partner joins.
- Test keyboard operation, focus, accessible naming, mobile layout, and announced feedback.
