## Why

Members can create and browse memory summaries, but the existing detail route exposes only a partial,
unstyled record and one cover image. US-005 completes the first private read experience so either active
member can open the full story and its ordered photos without weakening active-space or not-found privacy.

## What Changes

- Add an authorized memory-detail read for available timeline and shared Private Vault memories.
- Show complete memory metadata, the creator's current active-membership display name, and every available
  private photo with the selected cover first.
- Add keyboard-accessible photo selection and navigation with semantic position and selected state.
- Render valid no-photo and missing-optional-metadata states, a generic not-found result for every
  unavailable state, and a retryable failed-read state without stale detail content.
- Provide stable detail regions for visibility-appropriate memory actions, comments, and reactions that
  later stories can populate without implementing those mutations in US-005.
- Make timeline memory cards open their authorized memory-detail route.

## Capabilities

### New Capabilities

- `memory-detail`: Authorized complete memory reads, ordered private-photo delivery, detail presentation,
  extension regions, and detail-specific loading, empty, error, and not-found behavior.

### Modified Capabilities

- `memories-timeline`: Replace the reserved memory-detail link extension with an accessible link from each
  timeline card to the corresponding memory-detail route.

## Impact

- Affects the memory-detail route and new feature-owned detail components, styles, loading, and error UI.
- Extends server-side memory resolution to return creator attribution and all ordered photo metadata through
  short-lived signed URLs while preserving RLS and generic unavailable outcomes.
- Updates timeline card navigation without changing timeline eligibility, ordering, pagination, or Vault
  exclusion.
- Requires focused database/RLS, server, route, component, accessibility, responsive, and failure-state
  coverage; no new runtime dependency is expected.
