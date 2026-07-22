# US-024: Copy Invite Code

**Status:** Planned  
**Priority:** Should  
**OpenSpec:** Not created  
**Depends on:** US-020, US-025

## User Story

As a space member, I want to copy the invite code from settings so I can invite my partner or friend later if they have not joined.

## Intended Outcome

The sole active member can see a safely formatted invite code, copy it using the browser clipboard, and regenerate it after expiry, with understandable success and failure feedback.

## Business Rules

- Display formatting is presentation-only; the stored code remains normalized.
- A code expires 24 hours after issue and becomes invalid when the second member joins.
- The sole active member can regenerate an expired or missing code; regeneration invalidates the prior code.
- A two-member space shows joined status instead of an actionable invite code.

## Acceptance Criteria

- [ ] The sole active member can view a formatted unexpired code and copy it on supported devices.
- [ ] Success and clipboard failure messages are shown.
- [ ] Missing or expired code offers regeneration; a full space does not.
- [ ] The component works on mobile and does not expose another space's invite.

## Verification

- [ ] Test success, clipboard failure, expired/missing code, one-member and two-member states.
