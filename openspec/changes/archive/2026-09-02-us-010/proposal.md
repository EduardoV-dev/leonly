## Why

Memory detail currently preserves an empty extension point for comments, so partners cannot add the
context and meaning that turns a shared photo into a shared story. US-010 completes that conversation
loop for both Timeline and shared Private Vault memories while preserving Leonly's active-space privacy
boundary and recoverable interaction standards.

## What Changes

- Add a comment composer to authorized Timeline and Vault memory detail views with trimmed required
  text, a 1,000-character limit, pending protection, field-associated validation, and accessible async
  feedback.
- Add a newest-first comment history with current membership display names, creation timestamps,
  deterministic 20-item cursor pagination, load-more recovery, and no soft-deleted comments.
- Derive the author, active space, and memory access from the authenticated session rather than trusting
  client ownership or space identifiers.
- Make comment submission idempotent so retrying the same request cannot create duplicate comments.
- Refresh the local comment history after a successful submission while keeping realtime partner
  updates outside MVP scope.
- Define a reusable UI brief covering the complete comments-section composition, responsive behavior,
  accessibility, and every loading, empty, validation, pending, success, pagination, unavailable, and
  failure state.

## Capabilities

### New Capabilities

- `memory-comments`: Authorized comment creation, deterministic comment history, retry safety, and the
  complete memory-detail comment experience for Timeline and Vault memories.

### Modified Capabilities

None.

## Impact

- Adds comment persistence, indexes, row-level access rules, and a server-controlled idempotent create
  boundary in Supabase.
- Adds comment read/create server modules, validation, pagination contracts, types, and tests under the
  memories feature.
- Populates the existing comment extension region in both Timeline and Vault memory detail routes with
  one reusable client composition and localized copy.
- Adds focused tests for validation boundaries, authorization, deterministic pagination, duplicate
  retries, cache refresh, keyboard behavior, async announcements, and responsive UI states.
- Uses the existing Next.js, React, TanStack Query, Zod, i18n, Motion, Lucide, CSS Modules, and Leonly
  design primitives without a new runtime dependency.
