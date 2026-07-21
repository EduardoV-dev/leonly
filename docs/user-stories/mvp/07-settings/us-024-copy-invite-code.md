# US-024: Copy Invite Code

**Status:** Planned  
**Priority:** Should  
**OpenSpec:** Not created  
**Depends on:** US-020, US-025

## User Story

As a space member, I want to copy the invite code from settings so I can invite my partner or friend later if they have not joined.

## Intended Outcome

Active members can see a safely formatted invite code and copy it using the browser clipboard, with understandable success and failure feedback.

## Business Rules

- Display formatting is presentation-only; the stored code remains normalized.
- The OpenSpec must decide whether an expired or missing code is regenerated and by whom.
- A two-member space may show the code and joined status, but must not imply a new member can join if membership is capped.

## Acceptance Criteria

- [ ] Active members can view a formatted code and copy it on supported devices.
- [ ] Success and clipboard failure messages are shown.
- [ ] Missing or expired code has a safe fallback defined by the specification.
- [ ] The component works on mobile and does not expose another space's invite.

## Verification

- [ ] Test success, clipboard failure, expired/missing code, one-member and two-member states.
