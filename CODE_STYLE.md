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
- Biome enforces the limit for supported source files under `apps/`. SQL file length is not checked.

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
- Treat route handlers, Server Actions, RPC functions, webhooks, file uploads, URL parameters,
  cookies, headers, and third-party responses as untrusted input.
- Validate type, length, range, format, and allowed values on the server. Client validation is only
  for user experience.
- Return generic errors to clients. Do not expose stack traces, SQL details, internal paths, tokens,
  or information that helps enumerate users and resources.

### XSS And Browser Security

- Render untrusted text through React's normal JSX interpolation so React escapes it.
- Do not use `dangerouslySetInnerHTML` with user-controlled content. If rendering HTML is a product
  requirement, sanitize it with a maintained allowlist-based sanitizer at the final render boundary
  and add tests for scripts, event handlers, unsafe URLs, SVG, and malformed markup.
- Validate user-controlled URLs before assigning them to `href`, `src`, redirects, or CSS. Allow only
  required protocols and reject `javascript:`, `data:`, protocol-relative, and malformed URLs unless
  a reviewed use case explicitly needs them.
- Do not build executable JavaScript, HTML, CSS, or JSON by concatenating untrusted strings.
- Keep a restrictive Content Security Policy. Avoid `unsafe-inline` and `unsafe-eval`; use nonces or
  hashes when inline code is unavoidable.
- Set authentication cookies with `HttpOnly`, `Secure`, and an appropriate `SameSite` value. Never
  store session secrets in browser-readable storage.

### SQL And Other Injection Prevention

- Use the Supabase query builder, parameterized SQL, or typed RPC parameters. Never concatenate or
  interpolate untrusted values into SQL text.
- Values cannot parameterize table names, column names, sort directions, or operators. Map dynamic
  identifiers to a fixed server-side allowlist.
- Validate filter, pagination, and ordering input before passing it to a query builder. Do not accept
  arbitrary PostgREST filter syntax from clients.
- Avoid shell commands. When one is required, use argument-array APIs such as `execFile` or `spawn`
  without `shell: true`; never concatenate user input into a command.
- Treat template expressions, log fields, email headers, HTTP headers, and file paths as injection
  boundaries. Use structured APIs, reject control characters, and constrain paths to an expected
  root.

### Access And Data Protection

- Enforce authentication, authorization, ownership, and tenant membership on the server for every
  read and mutation. Hiding a UI control is not authorization.
- Never trust client-provided user IDs, roles, ownership fields, prices, statuses, or permission
  flags. Derive identity from the verified session and sensitive values from server-owned data.
- Enable Row Level Security on every exposed Supabase table and write policies for each permitted
  operation. Test that users cannot read or change another account's rows.
- Keep service-role credentials in server-only modules. Never expose them through `NEXT_PUBLIC_*`,
  client bundles, logs, errors, or test fixtures.
- Grant the least database and application privileges needed. Review every `security definer`
  function, set a safe `search_path`, schema-qualify referenced objects, and restrict execution.
- Encrypt sensitive data in transit and at rest with platform-supported cryptography. Do not invent
  encryption, hashing, token, or random-number algorithms.
- Collect and retain only the sensitive data the feature needs. Redact secrets, tokens, credentials,
  session data, and personal information from logs and analytics.

### OWASP Top 10 Baseline

Apply the current OWASP Top 10 controls to every feature. At minimum, follow these rules:

- Design authorization before implementation and deny access by default. Check object-level and
  function-level permissions to prevent broken access control.
- Keep production configuration restrictive: disable debug output, limit CORS to known origins, set
  security headers, and remove default accounts, sample endpoints, and unused services.
- Pin dependencies through the lockfile, review dependency changes, run automated vulnerability
  checks, and promptly update packages with exploitable advisories.
- Verify authentication callbacks, OAuth `state`, redirect destinations, session expiry, and account
  recovery flows. Rate-limit login, invite, lookup, and other abuse-prone endpoints.
- Protect state-changing cookie-authenticated requests from CSRF with `SameSite` cookies plus Origin
  checks or CSRF tokens where cross-site requests are possible. Do not mutate state through `GET`.
- Verify webhook signatures and the integrity and provenance of updates, generated artifacts, and
  serialized data before trusting them.
- Restrict server-side outbound requests to required hosts and protocols. Block private, loopback,
  link-local, metadata, and redirect-based destinations to prevent SSRF.
- Log security-relevant events with request and actor identifiers, but no secrets. Alert on repeated
  authentication failures, authorization failures, validation failures, and suspicious rate spikes.
- Set request body, upload, query, recursion, and execution limits. Handle timeouts and partial
  failures explicitly so exceptional conditions fail closed without corrupting data.
- Threat-model new trust boundaries and sensitive workflows during design. Add focused tests for
  access control, injection payloads, unsafe redirects, forged requests, and cross-tenant access.

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
