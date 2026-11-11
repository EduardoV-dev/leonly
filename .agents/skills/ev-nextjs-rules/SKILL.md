---
name: ev-nextjs-rules
description: "Trigger: implementing or checking Next.js code. Apply Next.js coding rules and exceptions."
license: Apache-2.0
metadata:
  author: "eduardovdev"
  version: "1.0"
---

# EV Next.js Rules

## Activation Contract

Apply these rules when implementing or checking Next.js code. Load general/domain rules through
`ev-coding-standards`; preserve project guidance and applicable exceptions.

## Hard Rules

- Keep route files such as `page.tsx`, `error.tsx`, and `loading.tsx` thin; they may re-export their
  feature implementation. Routes may own framework integration, metadata, configuration, and data-loading
  orchestration; move substantial feature UI and business workflows into feature modules. Preserve
  framework-required filenames/locations, exports, directives, and signatures. React's `index.tsx`
  folder convention applies to extracted feature components, not special Next.js entry files.
- Where React Server Components are supported, prefer server components unless browser state or
  interaction requires a client boundary. Trace module imports, not visual nesting: server-rendered
  content may pass through a client component's props without its implementation entering the client graph.
  Keep server loading/orchestration in async Server Components or server functions; React hook extraction
  does not require moving it into client state/effect hooks.
  Prevent unnecessary serialization of independent requests; preserve genuine dependencies, rate limits,
  and side-effect ordering. A slow request alone does not prove a waterfall.
- Keep server-only modules and secrets out of client import graphs. Never expose privileged values
  through `NEXT_PUBLIC_*` variables, client bundles, logs, errors, or fixtures.
  Distinguish supported Server Action references from ordinary server-only implementation imports.
- Use statically analyzable accesses when required by the bundler, such as literal
  `process.env.NEXT_PUBLIC_SITE_URL` reads inside the public environment constants module. Preserve
  general validation, defaults, initialization, and runtime/build-time evaluation requirements.
  Public values are exposed to browsers and normally frozen at build time; do not treat them as
  runtime configuration or freeze values that genuinely require runtime lookup.
- Treat Server Actions as untrusted server entry points; apply backend validation and the declared
  public/private access policy for every read/mutation rather than trusting invocation from a UI or
  typed arguments. Public actions do not automatically require login. Reuse existing
  validation and resource-level authorization in invoked server boundaries; verify enforcement on every
  invocation rather than duplicating checks at every layer.

## Decision Gates

| Scoped code | Action |
| --- | --- |
| App Router route or RSC/client boundary | Apply matching route/rendering rules. |
| Pages Router or other non-RSC code | Do not demand an unsupported Server Component migration. |
| Route handler or Server Action | Add backend rules; React rules require actual React usage. |
| Public/private environment configuration | Check bundler accesses and exposure boundaries. |
| Plain utility in a Next.js package | Apply Next.js rules only if it crosses a framework boundary. |

## Execution Steps

1. Identify owning Next.js version, router, directives, imports, and relevant configuration. Read the
   [paired examples and exceptions](references/examples.md), adapting framework APIs to the installed version.
2. Trace route ownership, client import graphs, rendering behavior, server entry points, and environment reads.
3. Verify applicable exceptions and applicable checks; do not replace project conventions unnecessarily.

## Output Contract

Report relevant checks and material gaps. For requested standards checks, report evidenced violations.

## References

- [Paired examples and exceptions](references/examples.md): thin routes, client graphs, request ordering,
  public/private configuration, and Server Action trust boundaries.
