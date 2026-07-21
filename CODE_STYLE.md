# Code Style

These rules apply to repository-authored code. Follow existing patterns unless they conflict with
this document.

## File Size

- Authored code files must not exceed 400 physical lines.
- Split files by responsibility before they reach the limit; do not compress formatting or combine
  unrelated statements to evade it.
- Generated files, dependency code, lockfiles, and build output are exempt.
- `pnpm check:file-length` enforces the limit for JavaScript, TypeScript, CSS, and SQL files under
  `apps/`, `scripts/`, and `supabase/`.

## React Components

- Declare one React component per production `.tsx` file.
- Move a component into its own kebab-case folder with an `index.tsx` entry point and a co-located
  CSS module when it has component-specific styles.
- Keep route convention files such as `page.tsx`, `error.tsx`, and `loading.tsx` thin. They may
  re-export the feature component that implements the route UI.
- Tightly coupled compound primitive families under `src/components/ui` may share a file when their
  API is intentionally consumed as one primitive family. Do not use this exception for page or
  feature components.

## Collocation

- A component used by one page belongs beside that page:
  `features/<feature>/pages/<page>/<component>/`.
- A component reused by multiple pages or modules in one feature belongs in
  `features/<feature>/components/<component>/`.
- A component reused across features belongs in `src/components/<component>/`.
- Keep component styles, tests, constants, and small helpers at the narrowest ownership level that
  uses them. Do not import one page's CSS module into another page or route state.
- Promote code only after it has multiple real consumers; do not create shared abstractions for
  hypothetical reuse.

## TypeScript And Formatting

- Use strict TypeScript and explicit types at exported boundaries.
- Avoid `any`; use `unknown` and narrow it.
- Use Biome as the formatting and linting source of truth: two spaces, 100-character line width,
  double quotes, semicolons, and trailing commas where valid.
- Keep imports focused and remove unused symbols.

## Verification

For substantial web-app changes, run:

```bash
pnpm --filter web-app check
pnpm --filter web-app typecheck
pnpm --filter web-app test:run
pnpm --filter web-app build
```
