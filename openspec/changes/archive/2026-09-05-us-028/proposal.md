## Why

Members currently see their membership display name in Settings but cannot correct it after joining a
space. They need a secure self-service update that changes current attribution across the active space
without modifying authentication-provider identity or rewriting authored records.

## What Changes

- Add an inline Settings workflow for the authenticated member to edit, validate, save, cancel, and
  retry their active-membership display name.
- Derive the target membership exclusively from the authenticated active membership and return one
  generic unavailable outcome for missing, inactive, or inaccessible membership state.
- Normalize the saved value by trimming it and require 2-100 Unicode characters at client, server,
  and database boundaries.
- Use the membership's `updated_at` revision for optimistic concurrency. A stale update preserves the
  attempted value, returns the current canonical name and revision, and requires explicit
  reconciliation before retrying.
- Reconcile Settings and refreshed historical author or creator attribution from the current
  membership row without rewriting comments, memories, or other authored records.
- Provide accessible labels, field-associated validation, duplicate-submit prevention, predictable
  focus, and announced pending, success, conflict, and failure feedback.

## Capabilities

### New Capabilities

- `display-name-management`: Secure active-membership display-name mutation, validation,
  concurrency, historical attribution, and recovery behavior.

### Modified Capabilities

- `shared-space-settings`: Make the current member's personal display name editable and reconcile the
  updated canonical value throughout Settings.

## Impact

- Settings read model, personal-settings UI, translations, styling, and interaction tests.
- A new authenticated PATCH boundary and server-only display-name update service.
- A Supabase migration adding a membership-derived, optimistic-concurrency RPC with restricted
  execution privileges.
- Existing comment and memory-detail reads remain record-source-of-truth consumers and are verified to
  resolve the updated membership display name after refresh.
