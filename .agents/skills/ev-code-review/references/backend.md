# Backend Rules

Apply to server operations, API handlers, data access, SQL, server configuration, and their tests.
Load general rules as well. Shared contracts may require inspection across frontend/backend assignments.

## Input And Error Boundaries

- Treat route handlers, server-invoked actions, RPC functions, webhooks, file uploads, URL parameters,
  cookies, headers, and third-party responses as untrusted input.
- Validate type, length, range, format, and allowed values on the server. Client validation is only for UX.
- Return generic client errors without stack traces, SQL details, internal paths, tokens, or enumeration clues.

## SQL And Other Injection Prevention

- Use a database query builder, parameterized SQL, or typed RPC parameters. Never concatenate or
  interpolate untrusted values into SQL text.
- Values cannot parameterize table names, column names, sort directions, or operators. Map dynamic
  identifiers to a fixed server-side allowlist.
- Validate filter, pagination, and ordering input before passing it to a query builder.
- Avoid shell commands. When required, use argument-array APIs such as `execFile` or `spawn` without
  `shell: true`; never concatenate user input into a command.
- Treat template expressions, log fields, email headers, HTTP headers, and file paths as injection
  boundaries. Use structured APIs, reject control characters, and constrain paths to an expected root.

## Access And Data Protection

- Enforce authentication, authorization, ownership, and tenant membership on the server for every
  read and mutation. Hiding a UI control is not authorization.
- Never trust client-provided user IDs, roles, ownership fields, prices, statuses, or permission flags.
  Derive identity from the verified session and sensitive values from server-owned data.
- Design authorization before implementation; deny access by default. Check object-level and
  function-level permissions to prevent broken access control.
- For any data store, test that users cannot read or change another account's rows.
- Grant the least database and application privileges needed. Load applicable technology companions
  for RLS and database-specific privileged-function requirements.

## Browser-Facing Server Security

- Keep a restrictive Content Security Policy. Avoid `unsafe-inline` and `unsafe-eval`; use nonces or
  hashes when inline code is unavoidable.
- Set authentication cookies with `HttpOnly`, `Secure`, and an appropriate `SameSite` value.
- Limit CORS to known origins and set security headers.
- Verify authentication callbacks, OAuth `state`, redirect destinations, session expiry, and account
  recovery flows. Rate-limit login, invite, lookup, and other abuse-prone endpoints.
- Protect state-changing cookie-authenticated requests from CSRF with `SameSite` cookies plus Origin
  checks or CSRF tokens where cross-site requests are possible. Do not mutate state through `GET`.

## Service And Operational Security

- Verify webhook signatures before trusting payloads.
- Restrict outbound requests to required hosts/protocols. Block private, loopback, link-local,
  metadata, and redirect-based destinations to prevent SSRF.
- Log security-relevant events with request and actor identifiers, but no secrets. Alert on repeated
  authentication, authorization, and validation failures, and suspicious rate spikes.
- Set request body, upload, query, recursion, and execution limits. Handle timeouts and partial
  failures explicitly so exceptional conditions fail closed without corrupting data.

## Completion Checklist

- Trust-boundary input is validated; identity, permissions, and sensitive values are server-owned.
- Authorization and cross-account isolation hold for reads and mutations.
- Queries, commands, paths, outbound requests, and webhooks have applicable injection/integrity controls.
- Cookie/CSP/CORS/CSRF controls apply where relevant; abuse and execution limits preserve data integrity.
- Relevant tests cover access control, hostile input, timeouts, and partial failures.
