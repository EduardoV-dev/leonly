# US-010 Verification

## Automated Gates

- `pnpm --filter web-app check`: passed with four pre-existing `noImgElement` warnings.
- `pnpm --filter web-app typecheck`: passed.
- `pnpm --filter web-app test:run`: 63 files and 328 tests passed.
- `pnpm --filter web-app build`: passed, including the dynamic comments route.
- `openspec validate us-010 --strict`: passed.
- `git diff --check`: passed.

The post-migration comment-creation regression is covered by tests that verify the RPC targets the named
idempotency constraint, preserves the Supabase error as a sanitized log cause, and keeps the client 500
response generic.

## Responsive Evidence

Headless Chrome device emulation rendered the comments composition with a long membership name,
localized timestamps, multiline content, and a 1,000-character unbroken string. The document reported no
horizontal overflow at 320, 375, 640, 768, or 1,024 CSS pixels. Repeating each viewport with the root text
size at 200% also reported no horizontal overflow. The primary action measured full-width at 320 and 375
pixels, then compact and right-aligned from 640 pixels onward.

## Accessibility Evidence

- Testing Library covers semantic section, heading, form, explicit textarea label, list/list items,
  keyboard form submission, invalid-submit focus, field association, draft preservation, polite status,
  alerts, retry controls, pagination, and unavailable-memory recovery.
- Comment content renders through JSX text interpolation and preserves line breaks; no HTML or Markdown
  rendering path exists.
- Focus indicators and 44-pixel minimum targets are explicit in the component styles.
- Reduced-motion media queries remove skeleton, spinner, and control motion.
- Measured local text colors meet at least 4.5:1 against their surfaces, and interactive boundaries meet
  at least 3:1. Error and pending states include text or icon cues rather than relying on color.

## Environment Limitation

The repository does not provide a running local Supabase instance or installed Supabase CLI, so the SQL
migration was verified through deterministic migration contract tests rather than a live local database.
