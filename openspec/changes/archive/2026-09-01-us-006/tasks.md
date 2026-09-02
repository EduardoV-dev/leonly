## 1. Vault Data Access

- [x] 1.1 Add a partial Vault eligibility index on active memories ordered by active space, memory
  date descending, creation timestamp descending, and UUID descending; verify it with a local Supabase
  reset without changing timeline eligibility.
- [x] 1.2 Add feature-owned Vault summary/page types, constants, and query keys with a fixed 20-item
  page boundary and no client-controlled visibility selector.
- [x] 1.3 Implement the active-space-authorized Vault page resolver using `visibility = 'vault'`,
  `deleted_at is null`, the full deterministic ordering tuple, and server-resolved private cover URLs.
- [x] 1.4 Implement strict Base64URL JSON v1 cursor validation, lexicographic next-page filtering,
  eligible-anchor validation, final-page termination, and first-page `cursorReset` recovery for invalid
  or stale cursors.
- [x] 1.5 Add the read-only Vault API boundary with bounded cursor input, safe client errors,
  structured server logging, and no record, lifecycle, or Storage-path disclosure.

## 2. Private Vault Experience

- [x] 2.1 Add the authenticated `/vault` route, route-level loading and error boundaries, route
  constant, and localized English/Spanish Vault copy while keeping route files thin.
- [x] 2.2 Enable the Vault destination in desktop and mobile dashboard navigation, extend active-section
  typing/current-page behavior, and preserve the existing responsive shell.
- [x] 2.3 Build the responsive shared-archive page and hero from `ui-prompt.md`, including explicit
  shared-member context, warm editorial styling, semantic landmarks, visible focus, and reduced-motion
  behavior.
- [x] 2.4 Build the Vault infinite-list query and presentation with memory summary/detail links,
  authorized cover fallbacks, optional metadata, later-capability extension regions, and no fabricated
  edit, restore, delete, or count controls.
- [x] 2.5 Implement Vault-shaped initial loading, 750 ms slow-network feedback, shared empty state with
  a valid create-memory path, retryable initial error, retained-card load-more retry, and cursor-reset
  replacement behavior.

## 3. Verification

- [x] 3.1 Add server and API tests for active-space isolation, fixed Vault eligibility, timeline and
  soft-delete exclusion, deterministic equal-value pagination, cursor shape, final-page termination,
  stale/invalid reset, safe errors, and private cover authorization/fallback.
- [x] 3.2 Add page and component tests for shared-access messaging, required and optional card content,
  accessible detail navigation, empty/loading/slow/error/load-more states, retry behavior, reset
  replacement, and absence of unshipped actions.
- [x] 3.3 Add dashboard shell/navigation tests for enabled desktop and mobile Vault links, current-page
  semantics, direct refresh, keyboard operation, and unchanged Dashboard/Timeline behavior.
- [x] 3.4 Verify the page at mobile, 640 px, 768 px, and 1024 px widths with no horizontal overflow,
  meaningful image alternatives, visible focus, reduced motion, and safe-area-aware mobile navigation.
- [x] 3.5 Run `pnpm --filter web-app check`, `pnpm --filter web-app typecheck`,
  `pnpm --filter web-app test:run`, `pnpm --filter web-app build`, and
  `openspec validate us-006 --strict`; resolve every failure before handoff.
