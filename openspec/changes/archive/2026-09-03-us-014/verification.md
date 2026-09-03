# US-014 Verification

## Automated Gates

- `pnpm --filter web-app exec vitest run src/features/memories/server/get-cover-preview-url.test.ts src/features/memories/server/get-memory-photo.test.ts 'src/app/api/memories/[memoryId]/photos/[photoId]/[variant]/route.test.ts' src/features/memories/server/get-memory-detail.test.ts src/features/memories/server/get-memory-for-editing.test.ts src/features/memories/components/memory-photo-gallery/index.test.tsx src/features/memories/components/memory-summary-card/index.test.tsx src/features/memories/components/memory-editor-photo-workspace/index.test.tsx src/features/memories/server/delete-memory.test.ts 'src/app/api/memories/[memoryId]/route.test.ts' src/features/memories/components/memory-delete-action/index.test.tsx src/features/memories/pages/memory-detail/index.test.tsx src/features/memories/pages/vault-memory-detail/index.test.tsx src/features/memories/components/memories-timeline/index.test.tsx src/features/memories/components/vault-memories/index.test.tsx`:
  passed, 15 files and 125 tests.
- `pnpm --filter web-app check`: passed across 358 files with four pre-existing `noImgElement`
  warnings.
- `pnpm --filter web-app typecheck`: passed; Next.js route types generated and TypeScript reported no
  errors.
- `pnpm --filter web-app test:run`: passed, 77 files and 461 tests.
- `pnpm --filter web-app build`: passed with Next.js 16.2.6; the output includes dynamic
  `/api/memories/[memoryId]` and `/api/memories/[memoryId]/photos/[photoId]/[variant]` routes.
- `openspec validate us-014 --strict`: passed (`Change 'us-014' is valid`).
- `git diff --check`: passed with no output.

## Focused Coverage

- Media resolver, route, detail, editor, gallery, and summary-card tests prove opaque same-origin cover
  and detail URLs, current parent authorization, server-owned path selection, direct image requests,
  accessible fallbacks, private no-store and nosniff headers, no redirects, and no bytes after deletion.
- Deletion module and route tests prove authenticated server-derived identity, strict bounded input,
  current-version RPC calls, 204 success, established conflict and generic unavailable responses,
  malformed RPC rejection, and redacted recoverable failures.
- Client tests prove cancellation and dismissal send no request, keyboard confirmation, focus return,
  single-flight pending behavior, disabled conflicting actions, localized live feedback, conflict refresh,
  uncertain-response reauthorization, retry, prior Timeline/Vault destinations, and no persistent query
  parameter.
- Successful deletion cancels, invalidates, and removes the root `memoryQueryKeys.all` family, which
  prefixes Timeline, Vault, detail, comments, reactions, and dashboard memory projections. Timeline and
  Vault executable tests prove navigation return starts again from the null cursor/first page.
- Summary-card tests prove Delete is absent from Timeline, Vault, recent-memory, and related-memory card
  variants, while direct Timeline and Vault detail tests prove the action is present only there.

## Responsive And Accessibility Evidence

- Testing Library executes the destructive flow through semantic `alertdialog`, named buttons, keyboard
  Enter and Escape, focus restoration, disabled pending controls, status live regions, cancellation,
  success, conflict, unavailable, uncertainty, and retry states.
- The dialog primitive constrains content to `calc(100% - 2rem)` with `max-w-lg`; its actions stack on
  narrow viewports and switch to a right-aligned row at the `sm` breakpoint. The deletion controls use
  44-pixel minimum heights and explicit `:focus-visible` outlines.
- The deletion stylesheet removes trigger transitions under `prefers-reduced-motion: reduce`; the shared
  detail, gallery, lightbox, summary-card, edit, placement, comment, and reaction styles retain their own
  reduced-motion rules.
- No headless browser harness is installed in this repository, so viewport overflow and computed-style
  behavior were not browser-measured. No manual screen-reader session was performed; screen-reader
  feedback is evidenced by semantic Radix dialog behavior and executable accessible-name/live-region tests,
  not claimed as manual assistive-technology validation.

## Environment Notes

- Database test suites are intentionally excluded from this repository. Focused and full Vitest runs
  emitted the existing `react-i18next` missing-instance warning from one Timeline reset test; the test
  and all suites passed.

## Staged Deployment Gate

Deploy revocable media delivery first and verify that Timeline, Vault, detail, and editing use the
reauthorizing same-origin media route with direct media and authenticated Storage denial after deletion.
Wait at least the former five-minute signed URL TTL after that deployment. Only then enable deletion
controls and deletion mutation traffic.

If rollback is required, disable the deletion controls and delete route first while retaining the media
proxy and stronger membership-parent-child locking. Already soft-deleted records remain governed by the
existing retained-data lifecycle.
