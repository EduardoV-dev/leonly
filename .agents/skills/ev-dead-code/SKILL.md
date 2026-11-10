---
name: ev-dead-code
description: "Trigger: dead code, unused code, unused exports, remove unused code. Find and safely remove proven-unused code within the requested scope."
license: Apache-2.0
metadata:
  author: "eduardovdev"
  version: "1.0"
---

# EV Dead Code

## Activation Contract

Use for requests to find or remove unused or unreachable code. A request to identify candidates is
read-only; edit only when removal is requested or otherwise authorized.

## Hard Rules

- Treat search, compiler, and static-analysis results as candidates, not proof of non-use.
- Inspect callers and entry points, including exports, public APIs, dynamic imports, reflection,
  framework registration, configuration, scripts, tests, and external consumers where applicable.
- Preserve public contracts, side effects, validation, error handling, and user changes. When usage
  cannot be established, retain the code and report the uncertainty.
- Work within the requested scope; load applicable project guidance and EV coding standards before
  code edits. No third-party skill or new tool installation is required.
- Default to staged, unstaged, and untracked non-ignored Git worktree changes; honor explicit scope.
  Inspect outside the scope only for usage evidence, not unrelated findings or edits. If the worktree
  is clean, report no changes; if no Git repository or explicit scope is available, ask for scope.
- Examine the entire scope for candidates; report every evidenced candidate, not a top-N selection.
- Combine compatible applicable skill instructions. Respect instruction hierarchy; surface unresolved
  conflicts before affected work rather than silently overriding another rule.

## Decision Gates

| Evidence | Action |
| --- | --- |
| Usage proven absent and removal authorized | Remove the code and update affected imports, tests, and references. |
| Public, dynamic, external, or otherwise uncertain usage | Retain and report the evidence gap. |
| Analysis or review only | Report candidates and evidence without edits. |

## Execution Steps

1. Establish scope, requested action, and relevant entry points and consumers.
2. Use available project tools and targeted searches to find candidates; trace usage and side effects.
3. Remove only proven-unused candidates when authorized; preserve behavior of remaining paths.
4. Run relevant tests, builds, and static checks for affected consumers; report unavailable checks.

## Evidence Examples

- Internal function: search the owning project, tests, registration, and configuration; remove only
  when callers and indirect entry points are ruled out.
- Exported library function: a repository search cannot rule out external consumers; retain unless
  the public contract and consumer evidence establish that it is unused.
- Dynamically loaded handler: inspect routes, plugins, configuration, generated references, and
  string-based lookups; retain if usage remains uncertain.
- Import: check module initialization, registration, instrumentation, and other side effects before
  removing it.

## Output Contract

Report every candidate in chat with location, usage evidence, uncertainty, and the smallest proposed
fix; identify removals and retained cases. State scope, checks, and gaps. If none are found, say so;
do not claim exhaustive proof when evidence or coverage is unavailable.
