# US-020: View Shared-Space Settings

**Status:** Planned  
**Priority:** Must  
**OpenSpec:** Not created  
**Depends on:** US-025

## User Story

As a space member, I want to view shared-space settings so I can manage basic information about our private space.

## Intended Outcome

The settings page presents space name, start date, invite code, member information, current member display name, account context, and a Private Vault link.

## Business Rules

- Only the active member's space can be read.
- One-member spaces prominently show invite status and code.
- Missing partner avatar or invite code uses a safe fallback.

## Acceptance Criteria

- [ ] Current-space settings, members, and Vault link are shown.
- [ ] One-member and missing optional-data states are handled gracefully.
- [ ] No-space users are redirected to setup.
- [ ] Loading, error, and responsive states are present.

## Verification

- [ ] Test active/no-space/one-member states, missing invite data, and cross-space routes.
