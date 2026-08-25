## 1. Authorized Detail Data

- [x] 1.1 Add a feature-owned memory-detail model and server resolver that validates the UUID, preserves
  the generic unavailable outcome from `get_available_memory`, and loads complete metadata plus the
  creator's current active-membership display name under existing RLS.
- [x] 1.2 Load all authorized photo rows once, promote the selected cover, retain ascending persisted order
  for the remainder, and concurrently resolve server-only short-lived URLs with per-photo fallback states.
- [x] 1.3 Add focused resolver tests for timeline and Vault memories, malformed and unavailable identifiers,
  current creator attribution, deterministic cover-first ordering, no-photo data, partial signing failure,
  and recoverable database failures.

## 2. Memory Detail Experience

- [x] 2.1 Add localized memory-detail copy and a thin server route that maps only unavailable results to the
  generic not-found boundary while propagating recoverable reads to a retryable error boundary.
- [x] 2.2 Build the responsive editorial detail composition for complete metadata, visibility context,
  optional-field absence, no-photo presentation, and unrendered action, reaction, and comment composition
  slots that later stories can populate.
- [x] 2.3 Build the focused photo-gallery client component with meaningful alternatives, selected position and
  total semantics, visible focus, direct selection, wrapping previous/next controls, load fallbacks, and no
  unnecessary controls for one photo.
- [x] 2.4 Add route-level detail-shaped loading and localized retryable error presentations that preserve the
  requested URL and never show stale memory content.
- [x] 2.5 Add component and route tests covering full and missing metadata, zero/one/multiple photos, keyboard
  navigation and wrapping, selected semantics, timeline and Vault visibility, generic not-found, retry, and
  direct server rendering.

## 3. Timeline Integration

- [x] 3.1 Make each timeline card's primary non-action content one accessible memory-detail link while keeping
  count and action extension regions as independent siblings with no nested interactive elements.
- [x] 3.2 Add timeline card and timeline-page tests proving correct UUID navigation, keyboard access, retained
  summary content, cover fallback, and compatibility with independently interactive extension content.

## 4. Verification

- [x] 4.1 Verify the detail experience at mobile, `sm`, `md`, and `lg` widths, with keyboard-only navigation,
  visible focus, reduced motion, meaningful image alternatives, and no horizontal overflow.
- [x] 4.2 Run `pnpm --filter web-app check`, `pnpm --filter web-app typecheck`,
  `pnpm --filter web-app test:run`, and `pnpm --filter web-app build`, then resolve every failure.
- [x] 4.3 Run `openspec validate us-005 --strict` and reconcile the implementation and completed task state
  against every memory-detail and modified timeline scenario before archival.
