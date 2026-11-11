# General Code And Security Rules

Apply to repository-authored code in every domain. Follow existing patterns unless they conflict
with these rules. Apply technology-specific requirements only to that technology. Resolve paths
relative to the owning application/package in monorepos; examples do not require new features.


## Priorities

- Correctness, security, accessibility, and data integrity take priority over every other rule.
- Apply KISS: choose the simplest design that clearly solves the current problem.
- Apply YAGNI: do not add abstractions, configuration, or extension points for hypothetical needs.
- Apply SOLID proportionally. Keep responsibilities and dependency boundaries clear. Add interfaces,
  factories, or layers only when they own a concrete responsibility required now; one consumer is not
  a prohibition, and multiple consumers do not justify forwarding-only abstractions.
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
- In monorepos with multiple applications under `apps/*`, applications must not import another
  application's source, whether through relative paths, aliases, or workspace dependencies. When code
  is genuinely shared, extract it into an existing or focused package under `packages/*` and have
  both applications consume its public exports. Keep application-specific entry points,
  configuration, and orchestration in their owning app; shared packages must not depend on app source.
  Recommend extraction for demonstrated reuse, not hypothetical future consumers.
- Isolate network, database, storage, timers, and navigation at explicit boundaries.
- Do not add a dependency when the platform, standard library, or an installed package is sufficient.
- Add wrappers around dependencies only when a concrete boundary or multiple consumers need one.

Direct dependency usage is acceptable when it follows project conventions. An adapter must own
translation, policy, or isolation required by the current feature; multiple consumers alone do not
justify a forwarding wrapper.

```ts
// Avoid: adds a layer without owning behavior.
async function findOrderById(orderId: string) {
  return database.orders.findUnique({ where: { id: orderId } });
}

// Accept: server-side feature logic uses the existing client directly.
async function cancelOrder(orderId: string) {
  const order = await database.orders.findUnique({ where: { id: orderId } });

  if (!order) {
    throw new OrderNotFoundError(orderId);
  }

  // Apply cancellation rules here.
}
```

A payment adapter that maps provider-specific statuses and errors into application-owned results
is justified even with one consumer. Do not flag existing layers merely because a small example
could omit them; assess their actual responsibility and project contracts.

## Functions And Naming

- Give each function one clear responsibility and prefer early returns over deep nesting.
- Use guard clauses and early returns (or `continue` in loops) instead of nesting `if` statements.
  Do not add an `else` after a branch that returns, throws, breaks, or continues.
- Extract compound conditions into descriptive boolean constants. Name individual domain checks
  when several conditions contribute to a decision; do not create variables for every operator.
- Simple, readable predicates such as `permissions.has("edit")` and `Array.isArray(value)` may appear
  directly in conditions. Assign long callbacks, compound domain checks, multi-step computations,
  and asynchronous lookup results to descriptive constants before using them in conditions.
  Judge expression complexity, not the method name: short `.some()` or `.every()` predicates may
  remain inline; long callbacks must be extracted. Keep the condition focused on the decision.
- Use a single object parameter for functions with more than two parameters and destructure it directly
  in the function signature instead of naming the parameter `options` or `params`.
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

```ts
// Accept: the decision is immediately readable.
if (permissions.has("edit")) {
  enableEditing();
}

if (Array.isArray(value)) {
  processValues(value);
}

// Avoid: a long callback hides the decision inside the condition.
if (
  memberships.some((membership) => {
    const isCurrentWorkspace = membership.workspaceId === workspace.id;
    const isActive = membership.status === "active";
    const hasEditRole = membership.roles.includes("editor");

    return isCurrentWorkspace && isActive && hasEditRole;
  })
) {
  enableEditing();
}

// Prefer: name the overall decision and its meaningful domain checks.
const canEditWorkspace = memberships.some((membership) => {
  const isCurrentWorkspace = membership.workspaceId === workspace.id;
  const isActive = membership.status === "active";
  const hasEditRole = membership.roles.includes("editor");

  return isCurrentWorkspace && isActive && hasEditRole;
});

if (canEditWorkspace) {
  enableEditing();
}
```

## Asynchronous Operations

- Prefer `await Promise.all([operationA(), operationB()])` over consecutive awaits when operations
  are independent and can safely run concurrently.
- Keep sequential awaits when results, ordering, shared state, or rate limits require them.
  Preserve error handling and side-effect safety: `Promise.all` rejects on the first rejection
  without cancelling operations already started.

## Magic Values

- Extract behavioral limits, persisted keys, shared identifiers, and repeated behavioral messages
  into purpose-named constants. Policy values and persisted keys need names even with one consumer.
- Keep obvious structural values, one-off presentation copy, local routes, and conventional protocol
  literals inline unless project conventions require otherwise. Reuse existing route/status constants
  when provided; do not extract a one-use route or HTTP status merely because it is a literal.
- Do not create constants that merely rename a literal without explaining its purpose.

```ts
// Avoid: the number's purpose is implicit.
const canRetry = attemptCount < 3;
```

```ts
// Prefer: explains the policy.
const MAX_PAYMENT_ATTEMPTS = 3;
const canRetry = attemptCount < MAX_PAYMENT_ATTEMPTS;

// Prefer: persisted keys form a contract across reads and writes.
const CHECKOUT_DRAFT_STORAGE_KEY = "checkout-draft";

// Accept: obvious structure and one-off presentation copy stay local.
const firstOrder = orders[0];
const hasOrders = orders.length > 0;
const buttonLabel = "Save";

// Avoid: merely renames presentation copy.
const SAVE_BUTTON_TEXT = "Save";
```

An isolated `"/settings"` link or `404` response status can remain inline. A repeated domain error
message shared across consumers should use a descriptive constant or the existing error definition.

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
- Return specific, safe messages for expected validation and domain failures. Use generic messages
  for unexpected internal failures and enumeration-sensitive authentication outcomes. Never expose
  raw exception messages, stack traces, SQL details, internal paths, tokens, or enumeration clues.
- Keep privileged credentials server-only. Never expose them through public environment variables,
  client bundles, logs, errors, or test fixtures.
- Encrypt sensitive data in transit and at rest with platform-supported cryptography. Do not invent
  encryption, hashing, token, or random-number algorithms.
- Collect and retain only sensitive data the feature needs. Redact secrets, tokens, credentials,
  session data, and personal information from logs and analytics.

These are individual error entries inside the existing API response envelope, not replacement
response shapes:

```ts
// Accept: safe, actionable validation feedback.
const dateRangeError = {
  code: "INVALID_DATE_RANGE",
  message: "End date must be after start date.",
  field: "endDate",
};

// Avoid: exposes implementation details from an unexpected failure.
const databaseError = {
  code: "DATABASE_ERROR",
  message: caughtError.message,
};

// Prefer: a safe recovery instruction without internal details.
const internalError = {
  code: "INTERNAL_ERROR",
  message: "Unable to save your changes. Try again.",
};
```

Account recovery must return the same public response whether the email exists, for example:
"If an account exists for this email, you will receive reset instructions."

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
- Assert public results, observable state changes, and externally meaningful effects. Avoid mocking
  or asserting internal helper calls or private sequencing unless they are an explicit contract.
- Add a regression test for a bug fix when practical.
- Replace network, storage, time, and other external boundaries when needed for deterministic tests,
  rather than mocking internal functions. Integration tests may deliberately use a real database or
  local service to verify the integration itself.
- Keep tests deterministic, readable, and colocated with their owner.

```ts
// Avoid: only proves an internal helper was called.
expect(validateOrder).toHaveBeenCalledWith(order);

// Prefer: proves the public behavior.
await expect(placeOrder(emptyOrder)).rejects.toThrow("Order must contain at least one item");

// Accept: an external-boundary mock verifies no financial effect occurred.
expect(paymentGateway.charge).not.toHaveBeenCalled();
```

The rejected call must settle before checking the absence of a charge. Interaction assertions are
appropriate for meaningful external effects, not merely because a method can be mocked.

## Comments And Formatting

- Comments should explain intent, constraints, invariants, or non-obvious trade-offs, not narrate
  readable code. Remove stale comments when behavior changes.
- Use the target project's configured formatter and linter as the source of truth. If no formatting
  convention exists, use two spaces, 100-character line width, double quotes, semicolons, and trailing
  commas where valid for the language.
- Keep imports focused and remove unused symbols.
- Avoid nested ternaries and useless `else` branches regardless of linter support. Guard clauses,
  unnested conditionals, named compound conditions, and assigned complex call results are required
  in review; simple readable predicates may remain inline.

### Logical Code Grouping

Rule ID: `general-logical-code-grouping`. Assess under `general-correctness-naming-boundaries`.

- Use one blank line between meaningful processing phases, such as validation/guards, preparation,
  transformations, side effects, and result construction. Keep closely related declarations and
  tightly coupled operations together; phase names do not mandate a separate group for each step.
- Apply grouping inside callbacks and loops as well as functions. Separate local preparation from
  a substantial returned object, and separate an accumulated result from its final return.
- Do not insert blank lines mechanically after every declaration, statement, or `await`. Short,
  single-purpose functions need no artificial separation. Avoid multiple consecutive blank lines
  and empty padding at block boundaries; preserve language syntax and existing tool constraints.
- Read the [grouping examples and tool-enforcement workflow](logical-code-grouping.md). Inspect the
  target project's configured formatter/linter and attempt compatible structural enforcement when
  tooling changes are in scope. Report semantic grouping separately from automated coverage; a
  passing formatter does not establish that logical groups are readable.

## Completion Checklist

- No authored code file exceeds 400 lines; files live at the narrowest ownership level.
- In monorepos with multiple `apps/*`, application-to-application source imports are replaced by
  shared package public exports when reuse is genuine.
- Names are descriptive, function and method names start with behavior-appropriate verbs, and
  error-creation names prefer an `Error` suffix; behavioral values are explained.
- Logical processing groups have intentional separation without padding every statement; compatible
  formatter/linter enforcement is checked and its semantic coverage limits are reported.
- Conditions name complex decisions and long call results; simple readable predicates may stay inline.
- Independent asynchronous operations use `Promise.all` where concurrent execution is safe.
- Environment reads use the owning project's constants boundary; missing variables are added there,
  with public/private separation and evaluation timing preserved.
- Relevant tests cover observable behavior; applicable domain/technology checklists are satisfied.
- For substantial changes, run documented lint/format checks, typecheck, non-watch tests, and build
  when available. Discover commands and package manager from guidance, manifests, scripts, and CI;
  do not assume an application name or toolchain.
- Follow the read-only verification policy below; no formatter write modes. Record unavailable checks
  and verification gaps.

## Read-Only Verification

- Read-only checks must not modify source, tracked files, or repository-local caches/build artifacts,
  nor mutate real application/service data. A command without a write flag is not necessarily read-only.
- Inspect scripts and tool configuration before execution. Where supported, direct caches and outputs
  outside the repository or run in a permitted isolated copy with the reviewed changes included.
  Temporary files and external tool caches are allowed only when the harness/user permits those writes.
  Test-only isolated services may be used when permitted; never substitute a real shared environment.
- If safe execution cannot be established, record the assigned check as `UNVERIFIED` with the reason.
  Do not silently skip it, run a writing command, or delete resulting artifacts to disguise writes.
- Runtime plan-mode restrictions take precedence: when all writes are prohibited, even temporary/cache
  writes and isolated execution that creates files are unavailable. Use inspection and genuinely
  non-writing checks instead. Fix mode may write within its authorized scope.

```text
// Avoid: assume `tsc --noEmit` or a test/build command cannot write caches or outputs.
// Prefer: inspect its configuration, use supported external output/cache locations or permitted
// isolation, and report UNVERIFIED if the check cannot run without prohibited side effects.
```
