## 1. Comment Persistence And Access

- [x] 1.1 Add the `memory_comments` migration with normalized plain-text constraints, server-owned
  identity and timestamps, soft deletion, parent-space consistency, unique author idempotency keys, and
  the active `(memory_id, created_at DESC, id DESC)` history index.
- [x] 1.2 Add least-privilege grants, RLS policies, and a server-controlled idempotent create transaction
  that revalidates active membership and available Timeline or Vault memory access without trusting
  client author or space values.
- [x] 1.3 Add migration-level tests for active same-space reads/creates, unauthenticated and inactive
  membership, cross-space and unavailable memories, soft-deleted comments, request-key mismatch, and
  completed retry deduplication.

## 2. Server Comment Contracts

- [x] 2.1 Add strict comment types, constants, and Zod validation for UUID inputs, trimmed required text,
  the 1,000-character boundary, and plain-text request fingerprints.
- [x] 2.2 Implement the authorized idempotent comment-create server boundary with generic unavailable,
  validation, mismatch, and recoverable failure outcomes plus current membership display-name resolution.
- [x] 2.3 Implement the 20-item newest-first comment page reader with full-tuple Base64URL v1 cursor,
  active-anchor validation, soft-delete exclusion, next-cursor generation, and first-page cursor reset.
- [x] 2.4 Add deterministic server tests for text boundaries and normalization, inert markup-like content,
  server attribution/timestamps, tied timestamp UUID ordering, multiple pages, invalid/cross-memory/stale
  cursors, and no duplicate or skipped active records.

## 3. Comment State And Data Flow

- [x] 3.1 Add memory-scoped TanStack Query keys and an infinite comment-history hook that flattens and
  deduplicates pages, replaces accumulated results on cursor reset, and preserves loaded pages during
  load-more failure.
- [x] 3.2 Add a composer hook with draft validation, character state, one UUID per logical submission,
  frozen pending input, same-request retry, edit-after-failure reset, canonical success reconciliation,
  local query invalidation, and unavailable-memory handling.
- [x] 3.3 Add focused hook tests for whitespace and over-limit drafts, double activation, pending state,
  successful clear/prepend/deduplication, retained draft on failure, same-key retry, new key after editing,
  cursor reset, and background refresh.

## 4. Memory Comments Interface

- [x] 4.1 Build the reusable feature-owned comments section, composer, comment item, history status, and
  pagination components from `ui-prompt.md`, using semantic form/list markup and co-located CSS Modules.
- [x] 4.2 Implement every defined visual state: initial loading and slow feedback, loaded, empty, pristine,
  valid, required, near-limit, over-limit, pending, success, recoverable submit error, initial history
  error, load-more available/pending/error, cursor refresh, end of history, and reduced motion.
- [x] 4.3 Add localized comments copy and accessible labels, field associations, live announcements,
  focus behavior, semantic timestamps, 44 px targets, contrast-safe non-color cues, and plain-text rendering.
- [x] 4.4 Populate the existing comment extension region in both Timeline and Vault memory-detail wrappers
  with the same composition, keeping comment failures independent from the authorized memory story and
  routing unavailable mutation outcomes to the generic not-found experience.
- [x] 4.5 Add Testing Library coverage for semantic composition, keyboard submission, validation focus and
  draft preservation, async announcements, all recovery controls, newest-first rendering, pagination,
  Timeline/Vault reuse, and absence of out-of-scope comment actions.

## 5. Responsive And Release Verification

- [x] 5.1 Verify the comments section at 320/375 px, 640 px, 768 px, and 1024 px with long names, localized
  timestamps, multiline 1,000-character comments, browser zoom, fixed mobile navigation, and no horizontal
  overflow or clipped actions.
- [x] 5.2 Verify keyboard-only use, screen-reader labels/status order, focus visibility, WCAG 2.2 AA
  contrast, reduced motion, and that failures and limits remain understandable without color.
- [x] 5.3 Run `pnpm --filter web-app check`, `pnpm --filter web-app typecheck`,
  `pnpm --filter web-app test:run`, and `pnpm --filter web-app build`, then run strict OpenSpec validation
  and record any manual browser evidence required for the final state matrix.
