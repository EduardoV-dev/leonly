# Code Style

These rules apply to repository-authored code. Follow existing patterns unless they conflict with
this document.

## Priorities

- Correctness, security, accessibility, and data integrity take priority over every other rule.
- Apply KISS: choose the simplest design that clearly solves the current problem.
- Apply YAGNI: do not add abstractions, configuration, or extension points for hypothetical needs.
- Apply SOLID proportionally. Keep responsibilities and dependency boundaries clear without adding
  interfaces, factories, or layers that have only one concrete use.
- Reuse existing code, native platform features, the standard library, and installed dependencies
  before creating custom infrastructure.

## File Size

- Authored code files must not exceed 400 physical lines.
- Split files by responsibility before they reach the limit; do not compress formatting or combine
  unrelated statements to evade it.
- Generated files, dependency code, lockfiles, and build output are exempt.
- `pnpm check:file-length` enforces the limit for JavaScript, TypeScript, CSS, and SQL files under
  `apps/`, `scripts/`, and `supabase/`.

## Collocation And Ownership

Create every element at the narrowest level that owns it. This applies to components, hooks, tests,
styles, constants, types, schemas, utilities, and server modules.

- Used by one component or page: place it beside that component or page.
- Used by multiple consumers in one feature: place it in the corresponding feature directory, such
  as `components/`, `hooks/`, `constants/`, `types/`, `utils/`, or `server/`.
- Used across multiple features: place it in the corresponding `src/` directory.
- Promote code only after a real additional consumer exists.
- Keep tests and component-specific styles beside their owner.
- Do not import one page's styles, constants, or private helpers into another page.

Example:

```text
features/space-setup/
  components/                   # reused across space-setup pages
  hooks/
    use-space-setup-storage.ts  # reused by create and join flows
  pages/
    create-space-setup/
      index.tsx
      use-create-space-setup-page.ts
      create-date-step/
  constants/
  server/
  types/
  utils/
```

## React Components And Hooks

- Declare one React component per production `.tsx` file.
- Use a kebab-case component folder with an `index.tsx` entry point and a co-located CSS module.
- Keep route files such as `page.tsx`, `error.tsx`, and `loading.tsx` thin; they may re-export their
  feature implementation.
- Components should describe rendered UI. Move non-trivial form handling, requests, navigation,
  side effects, and interaction state into a custom hook beside the component.
- A page-only hook belongs beside its page. A feature-shared hook belongs in `feature/hooks`; a
  cross-feature hook belongs in `src/hooks`.
- Hooks should expose domain-oriented state and actions rather than internal implementation details.
- Do not create a custom hook merely to wrap a simple derived value or one trivial toggle.
- Derive values during render instead of synchronizing duplicate state with effects.
- Keep state close to its consumers and promote it only when multiple consumers require it.
- Tightly coupled compound primitive families under `src/components/ui` may share a file when their
  API is intentionally consumed as one family. This exception does not apply to feature components.

## Dependencies And Boundaries

- UI may depend on feature logic; feature and domain logic must not depend on UI.
- Domain transformations should not import React, routing, or browser APIs.
- Keep server-only modules out of client bundles.
- Isolate network, database, storage, timers, and navigation at explicit boundaries.
- Do not add a dependency when the platform, standard library, or an installed package is sufficient.
- Add wrappers around dependencies only when a concrete boundary or multiple consumers need one.

## Functions And Naming

- Give each function one clear responsibility and prefer early returns over deep nesting.
- Keep transformations pure where practical and make side effects explicit.
- Use descriptive domain names for files, functions, classes, methods, variables, and types.
- Prefix hooks with `use`; booleans with `is`, `has`, `can`, or `should`; callback props with `on`;
  and internal event handlers with `handle`.
- Avoid vague names such as `data`, `item`, `thing`, `helper`, or `manager` when a precise domain name
  is available.
- Use `UPPER_SNAKE_CASE` only for true module-level constants.

## Magic Values

- Extract unexplained behavioral numbers, strings, routes, storage keys, statuses, limits, and
  repeated messages into descriptive constants.
- Keep obvious structural values and one-off presentation copy local when extraction would make the
  code harder to understand.
- Do not create constants that merely rename a literal without explaining its purpose.

## TypeScript And Contracts

- Use strict TypeScript and explicit types at exported boundaries.
- Avoid `any`; use `unknown` and narrow it.
- Validate untrusted input before treating it as a trusted type.
- Avoid type assertions unless runtime validation or a documented invariant justifies them.
- Use discriminated unions for mutually exclusive states instead of combinations of optional fields.
- Keep public APIs small and return domain-oriented values rather than implementation details.

## Errors And Security

- Validate input at trust boundaries and fail fast for impossible internal states.
- Never silently swallow errors; preserve the original cause when wrapping one.
- Present recoverable user-facing errors with a recovery path.
- Enforce authentication, authorization, and ownership on the server.
- Never trust client-provided identity or ownership fields.
- Never log or commit secrets, tokens, credentials, or sensitive personal data.

## Testing

- Write code with explicit boundaries so external effects can be replaced in tests.
- Test observable behavior and public contracts, not implementation details.
- Add a regression test for a bug fix when practical.
- Mock network, storage, time, and other external boundaries rather than internal functions.
- Keep tests deterministic, readable, and colocated with their owner.
- Prefer accessible Testing Library queries such as `getByRole` with a name.

## Accessibility And Performance

- Use semantic HTML before ARIA and preserve keyboard access, labels, visible focus, and meaningful
  image alternatives.
- Do not communicate state through color alone.
- Measure before optimizing; avoid speculative memoization, caching, and virtualization.
- Prevent obvious request waterfalls and unnecessary client components.
- Prefer server components unless browser state or interaction requires a client boundary.

## Comments And Formatting

- Comments should explain intent, constraints, invariants, or non-obvious trade-offs, not narrate
  readable code.
- Remove stale comments when behavior changes.
- Use Biome as the formatting and linting source of truth: two spaces, 100-character line width,
  double quotes, semicolons, and trailing commas where valid.
- Keep imports focused and remove unused symbols.

## Completion Checklist

- No authored code file exceeds 400 lines.
- New files live at the narrowest ownership level.
- Production React files contain one component, except approved compound primitives.
- Names are descriptive and behavioral values are explained.
- Relevant tests cover observable behavior.
- For substantial web-app changes, run:

```bash
pnpm --filter web-app check
pnpm --filter web-app typecheck
pnpm --filter web-app test:run
pnpm --filter web-app build
```
