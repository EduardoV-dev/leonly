# General Code And Security Rules

Apply to repository-authored code in every domain. Follow existing patterns unless they conflict
with these rules. Apply technology-specific requirements only to that technology. Resolve paths
relative to the owning application/package in monorepos; examples do not require new features.

## Priorities

- Correctness, security, accessibility, and data integrity take priority over every other rule.
- Apply KISS: choose the simplest design that clearly solves the current problem.
- Apply YAGNI: do not add abstractions, configuration, or extension points for hypothetical needs.
- Apply SOLID proportionally. Keep responsibilities and dependency boundaries clear without adding
  interfaces, factories, or layers that have only one concrete use.
- Reuse existing code, native platform features, the standard library, and installed dependencies
  before creating custom infrastructure.

## File Size

- Authored code files must not exceed 400 physical lines, including SQL.
- Split by responsibility before the limit; do not compress formatting or combine unrelated statements
  to evade it. Verify counts even when the linter does not enforce the limit.
- Generated files, dependency code, lockfiles, and build output are exempt.

## Collocation And Ownership

Create components, hooks, tests, styles, constants, types, schemas, utilities, and server modules
at the narrowest level that owns them.

- Used by one component, page, or server module: place it beside that owner.
- Used by multiple consumers in one feature: place it in that feature's corresponding directory,
  such as `components/`, `hooks/`, `constants/`, `types/`, `utils/`, or `server/`.
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

## Dependencies And Boundaries

- Feature and domain logic must not depend on UI. Domain transformations should not import UI
  frameworks, routing, or browser APIs.
- Isolate network, database, storage, timers, and navigation at explicit boundaries.
- Do not add a dependency when the platform, standard library, or an installed package is sufficient.
- Add wrappers around dependencies only when a concrete boundary or multiple consumers need one.

## Functions And Naming

- Give each function one clear responsibility and prefer early returns over deep nesting.
- Use guard clauses and early returns (or `continue` in loops) instead of nesting `if` statements.
  Do not add an `else` after a branch that returns, throws, breaks, or continues.
- Extract compound conditions into descriptive boolean constants. Name individual domain checks
  when several conditions contribute to a decision, rather than placing a long expression in an `if`.
- Assign function and method results to descriptive constants before using them in `if` conditions,
  including asynchronous lookups. Keep the condition focused on the decision.
- Use a single options object for functions with more than two parameters.
- Start function and method names with a verb that describes their behavior: use `generateTokenKey()`
  rather than `tokenKey()` when generating a key, or `getTokenKey()` when retrieving one. Preserve
  framework-required names and established component, hook, and predicate conventions.
- Keep transformations pure where practical and make side effects explicit.
- Use descriptive domain names for files, functions, classes, methods, variables, and types.
- Prefer an `Error` suffix for constants, functions, and classes responsible for error creation,
  following identifier casing: `validationError`, `createValidationError()`, `ValidationError`, or
  `VALIDATION_ERROR`. Preserve framework-required names and external contracts.
- Prefix booleans with `is`, `has`, `can`, or `should`.
- Avoid vague names such as `data`, `item`, `thing`, `helper`, or `manager` when a precise domain name
  is available.
- Use `UPPER_SNAKE_CASE` only for true module-level constants.
- Keep public APIs small and return domain-oriented values rather than implementation details.

## Asynchronous Operations

- Prefer `await Promise.all([operationA(), operationB()])` over consecutive awaits when operations
  are independent and can safely run concurrently.
- Keep sequential awaits when results, ordering, shared state, or rate limits require them.
  Preserve error handling and side-effect safety: `Promise.all` rejects on the first rejection
  without cancelling operations already started.

## Magic Values

- Extract unexplained behavioral numbers, strings, routes, storage keys, statuses, limits, and
  repeated messages into descriptive constants.
- Keep obvious structural values and one-off presentation copy local when extraction would make the
  code harder to understand.
- Do not create constants that merely rename a literal without explaining its purpose.

## Environment Variables

- Consume environment variables through the project's existing environment-variable constants
  module instead of reading the runtime environment directly in application code. This is a shared
  configuration boundary, regardless of how many consumers currently use a variable.
- Reuse the existing module and exports, even outside `src/constants`. Do not create a competing
  source of truth or move an established module just to match the default path.
- If no module exists, use `src/constants/environment-variables.<language-appropriate-extension>`
  in the owning application/package. Export named constants or an `ENVIRONMENT_VARIABLES` object,
  following project conventions. Add missing variables there and import them at consumers.
- Keep direct environment reads inside this boundary, including `process.env` and equivalent APIs.
- Preserve validation, defaults, initialization order, and runtime versus build-time evaluation.
  Load environment files before evaluating constants; do not freeze a value at import time when
  the application requires a runtime lookup.
- Keep private values server-only. Separate public/private constants when client code consumes
  configuration; never import secrets into client bundles. Respect bundler static-analysis requirements.
- Tool configuration/bootstrap files outside the application module graph may read the environment
  directly when importing application constants is unsupported. Tests may set/delete/stub variables;
  verify initialization and reset cached modules when testing import-time constants. These exceptions
  do not permit scattered application reads.
- In read-only reviews, recommend the appropriate constants change. Create modules, add variables,
  or replace reads only when fixes are requested.

## Errors And Security

- Validate untrusted input at trust boundaries before treating it as a trusted type; fail fast for
  impossible internal states. Client validation cannot replace server validation.
- Never silently swallow errors; preserve the original cause when wrapping one.
- Present recoverable user-facing errors with a recovery path.
- Return generic errors to clients. Do not expose stack traces, SQL details, internal paths, tokens,
  or information that helps enumerate users and resources.
- Keep privileged credentials server-only. Never expose them through public environment variables,
  client bundles, logs, errors, or test fixtures.
- Encrypt sensitive data in transit and at rest with platform-supported cryptography. Do not invent
  encryption, hashing, token, or random-number algorithms.
- Collect and retain only sensitive data the feature needs. Redact secrets, tokens, credentials,
  session data, and personal information from logs and analytics.

## OWASP Top 10 Baseline

Apply current OWASP Top 10 controls relevant to each feature; the core and domain rules are a minimum,
not a claim of exhaustive coverage.

- Threat-model new trust boundaries and sensitive workflows during design. Add focused tests for
  access control, injection payloads, unsafe redirects, forged requests, and cross-tenant access.
- Keep production configuration restrictive: disable debug output and remove default accounts,
  sample endpoints, and unused services. Apply server-specific controls from backend rules when relevant.
- Pin dependencies through the lockfile, review dependency changes, run automated vulnerability
  checks, and promptly update packages with exploitable advisories.
- Verify integrity and provenance of updates, generated artifacts, and serialized data before trusting them.

## Testing

- Write code with explicit boundaries so external effects can be replaced in tests.
- Test observable behavior and public contracts, not implementation details.
- Add a regression test for a bug fix when practical.
- Mock network, storage, time, and other external boundaries rather than internal functions.
- Keep tests deterministic, readable, and colocated with their owner.

## Comments And Formatting

- Comments should explain intent, constraints, invariants, or non-obvious trade-offs, not narrate
  readable code. Remove stale comments when behavior changes.
- Use the target project's configured formatter and linter as the source of truth. If no formatting
  convention exists, use two spaces, 100-character line width, double quotes, semicolons, and trailing
  commas where valid for the language.
- Keep imports focused and remove unused symbols.
- Avoid nested ternaries and useless `else` branches regardless of linter support. Guard clauses,
  unnested conditionals, named compound conditions, and assigned method results are required in review.

## Completion Checklist

- No authored code file exceeds 400 lines; files live at the narrowest ownership level.
- Names are descriptive, function and method names start with behavior-appropriate verbs, and
  error-creation names prefer an `Error` suffix; behavioral values are explained.
- Independent asynchronous operations use `Promise.all` where concurrent execution is safe.
- Environment reads use the owning project's constants boundary; missing variables are added there,
  with public/private separation and evaluation timing preserved.
- Relevant tests cover observable behavior; applicable domain/technology checklists are satisfied.
- For substantial changes, run documented lint/format checks, typecheck, non-watch tests, and build
  when available. Discover commands and package manager from guidance, manifests, scripts, and CI;
  do not assume an application name or toolchain.
- Keep checks read-only: no formatter write modes. Record unavailable checks and verification gaps.
