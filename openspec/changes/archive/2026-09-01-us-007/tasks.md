## 1. Edit Persistence And Authorization

- [x] 1.1 Add private edit-attempt, replacement-photo staging, and durable cleanup persistence with
  UUID idempotency, normalized fingerprint, expected memory version, completion outcome, safe
  constraints, restricted grants, and cleanup indexes.
- [x] 1.2 Add security-definer reservation, replacement staging, upload-marking, atomic finalization,
  failure, and cleanup RPCs that derive active-space authority, lock and version-check the memory,
  validate retained-photo ownership and cover integrity, preserve unrelated records, and expose no
  cross-space or lifecycle details.
- [x] 1.3 Add the authorized placement-neutral edit resolver with editable metadata, opaque version,
  ordered retained photo IDs, current cover, and short-lived editor preview URLs while returning one
  generic unavailable outcome for malformed, inaccessible, or deleted requests.
- [x] 1.4 Extract shared normalized detail, date/timezone, placement, file-content, photo-count, and
  cover validation used by create and edit without changing the existing create-memory contract.
- [x] 1.5 Implement the server edit workflow that fingerprints requests, stages and uploads private
  variants, finalizes once, preserves the prior memory on failure/conflict, cleans new failed objects,
  and schedules successful removed-photo objects for inaccessible cleanup.
- [x] 1.6 Add the authenticated edit API boundary with bounded multipart input, UUID idempotency and
  expected-version validation, field-safe errors, explicit conflict response, generic unavailable
  response, and structured logs without object paths or internal database details.

## 2. Shared Memory Editor Experience

- [x] 2.1 Extract the existing Create field, placement, photo-workspace, action, validation, responsive,
  and accessibility composition as the exact shared UI for Create and Edit while keeping their hooks,
  initial state, copy, request shapes, feedback, and navigation separate; retain create-memory behavior
  and tests.
- [x] 2.2 Implement edit draft state for prefilled fields plus discriminated retained/new photos,
  retained-order preservation, appended replacement order, remove-all, cover selection, local preview
  cleanup, five-photo enforcement, dirty input, and unchanged-attempt idempotency.
- [x] 2.3 Build the responsive Edit Memory page from `ui-prompt.md`, reusing the existing wide editor,
  Leonly visual tokens, semantic form structure, photo fallbacks, visible focus, and reduced-motion
  behavior without manual photo reordering.
- [x] 2.4 Move creation from `/timeline/new` to `/memories/new`, update every internal create-memory
  destination, and add one thin `/memories/[memoryId]/edit` server route with placement-neutral
  authorization, edit-shaped loading, recoverable error, and generic not-found boundaries around the
  shared editor; do not keep `/timeline/new` as the canonical creation route.
- [x] 2.5 Populate only the Timeline and Vault direct-detail action extension regions with concise,
  localized Edit links to `/memories/[memoryId]/edit`; place actions above preserved-by attribution on
  mobile and beside it on wider screens while keeping every summary surface free of Edit actions.
- [x] 2.6 Add localized English and Spanish editor copy for headings, fields, retained/new photo state,
  save/cancel, pending, validation, recoverable failure, conflict reload, no-photo draft, and success
  announcement.

## 3. Navigation, Conflict, And Refresh Integration

- [x] 3.1 Return cancel to the detail route for the memory's initial placement without mutation; after
  success, invalidate the memory query-key root, show the localized global success toast, and navigate
  to the clean detail route for the final persisted Timeline or Vault placement.
- [x] 3.2 Implement single-flight save and stale-version conflict UX that keeps the draft visible,
  prevents silent overwrite or automatic merge, and offers an explicit reload-current-memory path.
- [x] 3.3 Ensure changed title, date, location, description, cover, photos, and placement appear in
  Timeline, Vault, dashboard, detail, and related-memory projections after refresh while creator,
  comments, reactions, identifiers, and untouched metadata remain unchanged.

## 4. Verification

- [x] 4.1 Add server tests for both-member authorization, cross-space denial, normalized
  validation, retained/new ordering, five-photo and cover integrity, remove-all, version conflicts,
  idempotent retries, atomic finalization, failed-upload rollback, and old/new object cleanup
  accessibility.
- [x] 4.2 Add API tests for safe field errors, malformed identifiers and tokens, unavailable parity,
  conflict responses, duplicate pending/completed requests, payload boundaries, and log redaction.
- [x] 4.3 Add component and route tests for `/memories/new`, exact shared Create/Edit UI rendering,
  prefilled state, retained/new photo operations, remove-all, cover choice, placement changes, cancel,
  pending duplicate activation, retry, conflict reload, detail-only Edit links, absence of Edit on every
  summary surface, unified edit navigation, generic states, responsive attribution actions, and toast
  success announcements.
- [x] 4.4 Verify mobile, 640 px, 768 px, 1024 px, and wide desktop layouts with no horizontal overflow,
  keyboard-only operation, meaningful photo alternatives, visible focus, announced feedback, safe-area
  mobile navigation, and reduced motion.
- [x] 4.5 Run `pnpm --filter web-app check`, `pnpm --filter web-app typecheck`,
  `pnpm --filter web-app test:run`, `pnpm --filter web-app build`, database migration verification, and
  `openspec validate us-007 --strict`; resolve every failure before handoff.
