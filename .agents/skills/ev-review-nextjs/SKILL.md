---
name: ev-review-nextjs
description: "Trigger: Next.js code review with ev-code-review. Supply route, rendering, client/server boundary, and public environment rules."
license: Apache-2.0
metadata:
  author: "eduardovdev"
  version: "1.0"
---

# EV Next.js Review Rules

## Activation Contract

Use as an optional `ev-code-review` companion for scoped Next.js routes, rendering, Server Actions,
client/server boundaries, and environment configuration. Supply rules; do not start reviews or delegate.

## Hard Rules

- Preserve coordinator scope, baseline, read-only constraints, and general/domain rules.
- Keep route files such as `page.tsx`, `error.tsx`, and `loading.tsx` thin; they may re-export their
  feature implementation.
- Where React Server Components are supported, prefer server components unless browser state or
  interaction requires a client boundary; prevent unnecessary client components and request waterfalls.
- Keep server-only modules and secrets out of client import graphs. Never expose privileged values
  through `NEXT_PUBLIC_*` variables, client bundles, logs, errors, or fixtures.
- Use statically analyzable accesses when required by the bundler, such as literal
  `process.env.NEXT_PUBLIC_SITE_URL` reads inside the public environment constants module. Preserve
  general validation, defaults, initialization, and runtime/build-time evaluation requirements.
- Treat Server Actions as untrusted server entry points; apply backend validation and authorization
  for every read/mutation rather than trusting invocation from a UI.

## Decision Gates

| Scoped code | Action |
| --- | --- |
| App Router route or RSC/client boundary | Apply matching route/rendering rules. |
| Pages Router or other non-RSC code | Do not demand an unsupported Server Component migration. |
| Route handler or Server Action | Add backend rules; React rules require actual React usage. |
| Public/private environment configuration | Check bundler accesses and exposure boundaries. |
| Plain utility in a Next.js package | Apply Next.js rules only if it crosses a framework boundary. |

## Execution Steps

1. Identify owning Next.js version, router, directives, imports, and relevant configuration.
2. Trace route ownership, client import graphs, rendering behavior, server entry points, and environment reads.
3. Verify applicable exceptions and assigned checks; do not replace project conventions unnecessarily.

## Output Contract

Return candidates with severity, `path:line`, rule wording, evidence/impact, and smallest fix, plus gaps.
Checklist: thin routes, justified client boundaries, server-only imports, safe public environment
accesses, and validated/authorized Server Actions. The coordinator consolidates findings.
