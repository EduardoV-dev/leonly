# AGENTS.md
Guidance for agentic coding agents working in this repository.

## Repository Overview
- Monorepo uses `pnpm` workspaces + Turborepo.
- Main app: `apps/web-app` (Next.js 16 + React 19 + TypeScript + Vitest).
- Task graph: `turbo.json`.
- Lint/format: Biome (`biome.json`).
- Git hooks: Husky (`.husky/`).

## Environment
- Node.js 22+ (CI uses 22).
- Package manager: `pnpm@9.12.0`.
- Workspaces: `apps/*` in `pnpm-workspace.yaml`.
- `.npmrc` has `ignore-scripts=true`.
- Since install scripts blocked, run once per clone if hooks needed:

```bash
pnpm exec husky install
```

## Important Files
- `package.json`
- `CODE_STYLE.md`
- `turbo.json`
- `biome.json`
- `tsconfig.base.json`
- `apps/web-app/package.json`
- `apps/web-app/next.config.ts`
- `apps/web-app/vitest.config.ts`
- `apps/web-app/vitest.setup.ts`
- `.github/workflows/web-app-verify.yml`

## Build/Lint/Test/Typecheck Commands
Run from repo root unless noted.

### Install
```bash
pnpm install
```

### Root workspace commands
```bash
pnpm dev
pnpm build
pnpm lint
pnpm format
pnpm test
pnpm typecheck
```

### App-scoped commands (`web-app`)
```bash
pnpm --filter web-app dev
pnpm --filter web-app build
pnpm --filter web-app typecheck
pnpm --filter web-app lint
pnpm --filter web-app format
pnpm --filter web-app check
pnpm --filter web-app test
pnpm --filter web-app test:run
pnpm --filter web-app test:coverage
```

### Run single test file (important)
```bash
pnpm --filter web-app test -- src/App.test.tsx
pnpm --filter web-app test:run -- src/App.test.tsx
```

### Run single test case by test name
```bash
pnpm --filter web-app test -- -t "renders starter heading"
pnpm --filter web-app test:run -- -t "renders starter heading"
```

### Test command notes
- `test` = Vitest watch mode.
- `test:run` = one-shot CI mode.
- Coverage output path: `apps/web-app/coverage`.

## CI + Hook Gates
CI workflow (`.github/workflows/web-app-verify.yml`) requires:
1. `pnpm --filter web-app check`
2. `pnpm --filter web-app typecheck`
3. `pnpm --filter web-app test:run`
4. `pnpm --filter web-app build`

Local hooks:
- Pre-commit (`.husky/pre-commit`)
  - `pnpm lint-staged`
  - `pnpm --filter web-app typecheck`
  - `pnpm --filter web-app test:run`
- Pre-push (`.husky/pre-push`)
  - `pnpm --filter web-app build`

Lint-staged rule (`.lintstagedrc.json`):
```bash
pnpm exec biome check --write
```
Targets: `*.{js,jsx,ts,tsx,cjs,mjs,json}`.

## Code Style Guidelines
Read `CODE_STYLE.md` before writing or refactoring code. Its architecture, naming, file-size,
component-structure, testability, and collocation rules are mandatory for every change.

Follow existing patterns first. Keep edits minimal and local.

### Frontend Design
- Read `DESIGN.md` before creating or substantially changing a frontend screen.
- Preserve the established Leonly visual system, components, responsive patterns, and accessibility requirements.

### Formatting
- Use Biome as source of truth.
- 2 spaces, width 100, double quotes, semicolons always, trailing commas where valid.
- Do not hand-format against Biome output.

### Imports
- Order groups: external packages, internal modules, side-effect/style imports.
- Keep one import declaration per module source.
- Prefer relative paths, matching current app conventions.
- Remove unused imports/symbols.

### TypeScript
- Repo uses strict TypeScript (`strict: true`) from `tsconfig.base.json`.
- `noEmit: true`; typecheck done with `tsc -p tsconfig.json`.
- Prefer explicit types at boundaries (component props, exported functions, return types).
- Avoid `any`; use `unknown` and narrow.
- Do not introduce JS files for TS logic (`allowJs: false`).

### React and Component Structure
- Use function components.
- Keep authored code files at or below 400 physical lines. `pnpm check:file-length` enforces this.
- Declare one React component per production `.tsx` file. Compound primitive families under
  `src/components/ui` are the only exception.
- Collocate page-only components beside their page, feature-reused components under the feature's
  `components/`, and cross-feature components under `src/components/`.
- Keep component-specific CSS modules beside their component; never borrow another page's styles.
- Use kebab-case component folders with an `index.tsx` entry point; use PascalCase only for
  standalone component filenames.
- Variables/functions: `camelCase`.
- Types/interfaces/components: `PascalCase`.
- Constants: `UPPER_SNAKE_CASE` only for true constants.
- Keep render logic readable; extract helpers when JSX gets crowded.

### Error Handling
- Throw explicit `Error` messages for impossible startup/invariant states.
- Prefer fail-fast over silent fallback for broken assumptions.
- In tests, assert user-visible behavior, not internal implementation details.

### Testing Conventions
- Framework stack: Vitest + Testing Library + `@testing-library/jest-dom`.
- Test environment: `jsdom` configured in `apps/web-app/vitest.config.ts`.
- Setup file: `apps/web-app/vitest.setup.ts`.
- Prefer accessible queries (`getByRole` + name) over brittle selectors.
- Keep tests deterministic; mock timers/network when needed.

### CSS Conventions
- Current global style file: `apps/web-app/src/styles/globals.css`.
- Preserve existing visual language unless task requests redesign.
- As styles grow, introduce reusable variables/tokens.

## Agent Workflow Expectations
- Make smallest safe change solving request.
- Avoid unrelated refactors.
- Keep Biome + strict TS clean.
- For substantial changes, run before handoff:

```bash
pnpm --filter web-app check
pnpm --filter web-app typecheck
pnpm --filter web-app test:run
pnpm --filter web-app build
```

- If only tests changed, run at least relevant targeted tests.

## Cursor/Copilot Rule Files
Searched for repository rule files:
- `.cursor/rules/`
- `.cursorrules`
- `.github/copilot-instructions.md`

Status: none found in this repository.
If added later, treat as highest-priority local instructions and update this file.
