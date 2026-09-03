## 1. Comment Update Contract

- [x] 1.1 Add a migration for server-owned comment version and update metadata, plus the least-privilege
  authorized conditional-update RPC and migration-level coverage.
- [x] 1.2 Extend comment types, validation, and server update boundary to return completed, invalid, conflict,
  and generic unavailable outcomes without leaking ownership or availability.
- [x] 1.3 Add an author-only PATCH route with strict request validation, generic client errors, and focused
  route/server tests for successful updates, validation, access control, stale versions, and deleted targets.

## 2. Comment Edit Experience

- [x] 2.1 Add query-cache reconciliation that replaces an updated comment by ID across loaded history pages.
- [x] 2.2 Build the author-gated comment edit interaction with editable draft, validation, save, cancel,
  pending, retry, success, and accessible live feedback.
- [x] 2.3 Add conflict recovery that preserves the attempted draft, reports a stale edit without overwriting
  persisted text, and lets the author refresh or cancel predictably.
- [x] 2.4 Add localized English and Spanish copy plus responsive component styles consistent with the existing
  editorial comments section.

## 3. Verification

- [x] 3.1 Add deterministic hook and Testing Library coverage for author gating, validation, pending state,
  successful cache replacement, retry, cancel, keyboard operation, conflict draft preservation, and refresh.
- [x] 3.2 Run `pnpm --filter web-app check`, `pnpm --filter web-app typecheck`,
  `pnpm --filter web-app test:run`, `pnpm --filter web-app build`, and strict OpenSpec validation; record
  the results.
