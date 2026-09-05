## Why

The current dashboard silently regenerates unavailable invites and Settings only reports invite
status, so the sole active member cannot deliberately copy, recover, or understand the invite that
controls access to the shared space. US-024 turns those partial surfaces into one secure,
predictable invite-management experience before additional Settings mutations are introduced.

## What Changes

- Add one reusable invite-status experience to Dashboard and Settings for one-member spaces.
- Show a formatted valid code, waiting status, copy action, announced success, and a manual-copy
  fallback when the Clipboard API is unavailable or denied.
- Replace automatic regeneration with an explicit action for missing or expired invites and display
  the newly issued code in place without navigation or reauthentication.
- Keep the dashboard invite section before every summary or action while one active member exists,
  and remove it completely after the second member joins.
- Show joined status without a code or regeneration action in Settings for two-member spaces.
- Enforce active-membership authorization, single-member eligibility, atomic prior-code
  invalidation, and server-side regeneration rate limiting without accepting a client-selected space.
- Standardize invite normalization and presentation across management and redemption.

## Capabilities

### New Capabilities

- `partner-invite-management`: Secure invite status, copy, manual fallback, regeneration, dashboard
  placement, joined-state behavior, accessibility, and responsive presentation.

### Modified Capabilities

- `shared-space-settings`: Replace the reserved read-only invite region with the actionable reusable
  invite-status experience while preserving the non-actionable two-member joined state.

## Impact

- Updates dashboard and Settings components, shared invite presentation and interaction logic,
  translations, responsive styles, and behavior tests in `apps/web-app`.
- Updates the invite regeneration API and Supabase RPC/data model to enforce membership-derived
  authorization, eligibility, atomic invalidation, and throttling.
- Reuses the existing eight-character normalized invite contract and `XXX-XXXXX` display format;
  no new runtime dependency is required.
