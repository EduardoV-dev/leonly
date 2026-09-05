## Why

The shared start date is currently read-only, so an incorrect date leaves the Settings summary and
inclusive dashboard counter permanently inaccurate. US-027 lets either active member correct it while
respecting browser-local calendar rules and preventing concurrent edits from silently overwriting one
another.

## What Changes

- Let either active member edit the active space's date-only start date from the shared Settings
  section.
- Validate required, real `YYYY-MM-DD` values against the acting member's server-verified local date,
  using a client-supplied IANA timezone rather than a client-supplied `today` value.
- Save through a membership-derived mutation that accepts no client-selected space, membership,
  owner, or user identifier.
- Use optimistic locking so a stale update returns a conflict with the current canonical date and
  revision instead of overwriting the other member's correction.
- Preserve attempted input across validation, conflict, and recoverable failure states, with explicit
  accept-current and retry actions.
- Refresh Settings and the dashboard after success so the displayed date and inclusive day counter
  use the canonical persisted value.
- Provide accessible, responsive edit, cancel, save, pending, success, conflict, and failure behavior
  in English and Spanish.

## Capabilities

### New Capabilities

- `start-date-management`: Equal-member authorization, timezone-aware date validation, optimistic
  concurrency, mutation outcomes, refresh behavior, and accessible start-date editing.

### Modified Capabilities

- `shared-space-settings`: Replace the reserved start-date action region with the authorized inline
  editor while preserving the existing space-name workflow.

## Impact

- Adds a forward Supabase migration and authenticated RPC for membership-derived, version-checked
  start-date updates.
- Extends the Settings read/mutation model, shared Settings presentation, translations, and focused
  tests in `apps/web-app`.
- Reuses the existing date-only picker and inclusive dashboard counter; no new runtime dependency or
  realtime subscription is required.
