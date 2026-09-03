## 1. Secure Deletion Path

- [x] 1.1 Add a migration with an atomic, version-conditional comment soft-delete RPC, restricted
  execution grants, and RLS-compatible active membership, ownership, memory availability, and
  active-comment checks.
- [x] 1.2 Add server-side deletion domain logic that maps success, conflict, and all unavailable
  targets to the specified response contract without target-state leakage.
- [x] 1.3 Extend the comment item API route with a strict `DELETE` request payload, generic
  unavailable response, request logging, and unexpected-error fallback.
- [x] 1.4 Add server and route tests for author success, non-author and forged requests, inactive or
  unauthenticated membership, cross-space and unavailable targets, repeat deletion, version conflict,
  and generic failure behavior.

## 2. Comment Data Reconciliation

- [x] 2.1 Add a cache helper that removes a deleted comment by ID across all loaded comment pages
  without mutating unrelated entries.
- [x] 2.2 Add a comment deletion mutation hook that sends the expected version, serializes pending
  actions, differentiates unavailable, conflict, and retryable failure outcomes, and refreshes after
  uncertain responses.
- [x] 2.3 Reconcile successful deletion with comment history, active-comment counts, cursor reset
  handling, and the existing generic memory-unavailable experience.
- [x] 2.4 Add hook tests for cache removal, success reconciliation, failure retention and retry,
  conflict refresh, and indeterminate-response reconciliation.

## 3. Accessible Author Experience

- [x] 3.1 Add an author-only destructive delete control to the comment item and prevent concurrent
  edit/delete actions while deletion is pending.
- [x] 3.2 Add the accessible confirmation dialog with destructive labels, keyboard operation, managed
  focus, cancellation, pending state, and logical focus restoration after success.
- [x] 3.3 Add localized deletion labels, confirmation copy, pending/status messages, conflicts, and
  retryable failures; publish outcomes through the existing live region.
- [x] 3.4 Add component tests for author visibility, partner absence, confirmation and cancellation,
  keyboard behavior, focus restoration, pending state, success removal/count refresh, and retryable
  failure feedback.

## 4. Verification

- [x] 4.1 Run `pnpm --filter web-app check`, `pnpm --filter web-app typecheck`, and targeted comment
  tests while implementing.
- [x] 4.2 Run `pnpm --filter web-app test:run` and `pnpm --filter web-app build` before handoff.
