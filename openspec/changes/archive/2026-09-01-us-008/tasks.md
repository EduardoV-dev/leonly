## 1. Atomic Placement Boundary

- [x] 1.1 Add a Supabase migration with a least-privilege transactional RPC that validates authenticated
  active-space membership, active lifecycle, source visibility, and expected version before changing
  only memory visibility and updated timestamp.
- [x] 1.2 Add feature-owned placement types and server workflow that maps RPC outcomes to successful,
  stale-conflict, generic-unavailable, and recoverable-failure results without record-state disclosure.
- [x] 1.3 Add the authenticated placement API route with strict UUID/version/target validation,
  structured server error logging, and safe response shapes.

## 2. Detail Placement Experience

- [x] 2.1 Extend authorized Timeline and Vault detail data with the encoded memory version required for
  placement without exposing storage paths or changing detail availability boundaries.
- [x] 2.2 Build one localized client placement-action component that derives its "Move to ..." label and
  target from current visibility, exposes accessible pending/error state, and prevents duplicate
  activation.
- [x] 2.3 Render the placement action only on Timeline and Vault direct detail pages alongside existing
  detail actions, preserving responsive attribution/action layout and keyboard access.
- [x] 2.4 On successful placement, invalidate all memory queries, announce localized success, and navigate
  to the destination Timeline or Vault detail route; refresh the current detail on stale conflict and
  retain it with retry guidance on recoverable failure.

## 3. Verification

- [x] 3.1 Add server and API tests for active-space authorization, both placement directions,
  data-preservation contract, stale-version protection, generic unavailable outcomes, and safe failures.
- [x] 3.2 Add detail component and route tests for contextual labels, absence from list cards, pending
  duplicate prevention, success navigation/query invalidation, conflict refresh, and retryable errors.
- [x] 3.3 Run `pnpm --filter web-app check`, `pnpm --filter web-app typecheck`,
  `pnpm --filter web-app test:run`, `pnpm --filter web-app build`, and
  `openspec validate us-008 --strict`; resolve every failure before handoff.
