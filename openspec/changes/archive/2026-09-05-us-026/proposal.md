## Why

The shared-space name is currently read-only, so neither active member can keep the space's identity
aligned with how their relationship or friendship evolves. US-026 adds one secure rename workflow to
Settings while protecting concurrent edits from silent overwrite.

## What Changes

- Let either active member edit the active space name from the shared Settings section.
- Validate the trimmed name as required and between 2 and 100 characters at client and server trust
  boundaries.
- Save through a membership-derived mutation that accepts no client-selected space, member, owner, or
  user identifier.
- Use optimistic concurrency so a stale rename returns a conflict instead of replacing the other
  member's newer name.
- Preserve attempted input across validation, conflict, and recoverable failure states, with explicit
  refresh and retry paths.
- Refresh Settings, dashboard, and navigation after success so every rendered consumer uses the new
  canonical name.
- Provide accessible edit, cancel, save, pending, success, conflict, and failure behavior in English
  and Spanish.

## Capabilities

### New Capabilities

- `space-name-management`: Equal-member authorization, validation, optimistic concurrency, mutation
  outcomes, refresh behavior, and accessible rename interaction.

### Modified Capabilities

- `shared-space-settings`: Replace the reserved read-only space-name extension region with the
  actionable rename workflow while leaving the date action reserved for a later story.

## Impact

- Adds a forward Supabase migration and authenticated RPC for membership-derived, version-checked
  active-space renames.
- Updates the Settings read model, shared-settings presentation, translations, and focused behavior
  tests in `apps/web-app`.
- Refreshes existing server-rendered active-space consumers after successful mutation; no new runtime
  dependency or realtime subscription is required.
