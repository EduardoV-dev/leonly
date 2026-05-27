# leonly monorepo

Monorepo scaffold with pnpm workspaces + Turborepo.

## Structure

- `apps/web-app`: React + Vite + TypeScript app with Vitest.

## Requirements

- Node.js 22+
- pnpm 9+

## Getting started

```bash
pnpm install
```

## Workspace commands

```bash
pnpm dev
pnpm build
pnpm test
pnpm lint
pnpm format
pnpm typecheck
```

## web-app commands

```bash
pnpm --filter web-app dev
pnpm --filter web-app build
pnpm --filter web-app test
pnpm --filter web-app test:run
pnpm --filter web-app test:coverage
pnpm --filter web-app check
pnpm --filter web-app typecheck
```

## Biome + TypeScript

- Biome config at `biome.json` (lint + format).
- Shared TypeScript baseline at `tsconfig.base.json`.

## Husky and ignore-scripts impact

Repo uses `.npmrc` with:

```ini
ignore-scripts=true
```

Effect: package lifecycle scripts do not run during `pnpm install`.
This blocks auto-bootstrap flows like Husky `prepare` scripts.

Hooks are committed in `.husky/`, but local Git still needs hooks path setup once:

```bash
pnpm exec husky install
```

After setup:

- `pre-commit`: runs lint-staged (Biome), `web-app` typecheck, `web-app` tests.
- `pre-push`: runs `web-app` build.

## CI

Workflow at `.github/workflows/web-app-verify.yml` runs on pushes to `main` and verifies `apps/web-app`:

- Biome check
- TypeScript check
- Tests
- Build
