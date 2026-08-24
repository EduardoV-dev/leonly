## 1. Prerequisite and Data Access

- [x] 1.1 Confirm the completed `memory-lifecycle-foundation` contract provides UUID-string memory and
  photo identifiers; `deleted_at` availability; timeline visibility; active-space RLS;
  `get_available_memory(uuid)`; inherited photo availability; and the ordered timeline index.
- [x] 1.2 Add an active-space-authorized timeline read that applies
  `visibility = 'timeline' and deleted_at is null`, consumes the foundation's ordered index, and reads
  photo previews only through their available parent memory.
- [x] 1.3 Implement versioned opaque cursor encoding, decoding, UUID-string shape validation, anchor
  validation, and first-page recovery with `cursorReset` for malformed, unsupported, and stale cursors.
- [x] 1.4 Use `get_available_memory(uuid)` for authorized memory-detail resolution and map its null
   result to the same generic not-found outcome for absent, deleted, inaccessible, and other-space UUIDs
   while allowing authorized Vault detail access.
- [x] 1.5 After each authorized timeline or detail read, resolve each cover to a short-lived signed URL
  on the server; omit it when no cover exists or signing fails, and never return `object_path` to the
  UI. Preserve the 20-item UUID cursor, eligibility predicates, active-space authorization, Vault
  timeline exclusion, and generic not-found outcomes.

## 2. Timeline Experience

- [x] 2.1 Add the active-space timeline route or dashboard entry using the authorized first-page
  query and a 20-item page boundary.
- [x] 2.2 Build the memory summary card with title, memory date, cover preview or fallback, optional
   description and location previews, and explicit extension regions for future counts, detail links,
   and actions. Consume only the server-provided signed cover URL and render the existing accessible
   fallback when it is absent; never derive a Storage URL from `object_path`.
- [x] 2.3 Implement initial loading, empty, 750 ms slow-network, retryable page-error, and generic
  not-found states with accessible feedback.
- [x] 2.4 Implement load-more behavior that appends only successful next pages, preserves existing
  cards after failure, retries the failed cursor, and replaces cards after a `cursorReset` response.
- [x] 2.5 Refresh from page one after manual refresh, navigation return, and completed local actions
  that can affect timeline eligibility; do not add realtime synchronization.

## 3. Verification

- [x] 3.1 Add app-level data-access tests for active-space isolation, `visibility = 'timeline' and
  deleted_at is null` filtering, inherited photo availability, full ordering, equal-date pagination,
  final-page termination, and malformed or stale cursor recovery.
- [x] 3.2 Add route and UI tests for required card fields, optional-field fallbacks, initial loading,
   slow network, empty state, initial failure retry, load-more failure retry, refresh, cursor-reset
   replacement, server-provided signed cover rendering, and the accessible fallback when no cover or
   signing resolution fails.
- [x] 3.3 Add app-level authorization tests proving the `get_available_memory(uuid)` null result maps
   to generic not-found for unavailable UUIDs and allows authorized direct access to a Vault memory
   without timeline inclusion.
- [x] 3.4 Run `pnpm --filter web-app check`, `pnpm --filter web-app typecheck`,
   `pnpm --filter web-app test:run`, and `pnpm --filter web-app build`; resolve all failures before
   handoff. Do not add SQL test tasks.
- [x] 3.5 Add data-access and route tests proving signed cover URLs are resolved only after an
  authorized timeline or detail read; unavailable reads do not resolve or expose a cover path; and the
  timeline's 20-item UUID cursor, deleted-at eligibility, and scope boundaries remain unchanged.
