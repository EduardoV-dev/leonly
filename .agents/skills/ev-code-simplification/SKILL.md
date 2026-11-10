---
name: ev-code-simplification
description: "Trigger: simplify code, deduplicate, find code duplication, refactor complexity. Find and safely simplify or consolidate code."
license: Apache-2.0
metadata:
  author: "eduardovdev"
  version: "1.0"
---

# EV Code Simplification

## Activation Contract

Use when asked to find or reduce duplication or simplify existing code. Finding or reviewing
opportunities alone is read-only; edit only when simplification or removal is authorized.

## Hard Rules

- Understand responsibilities, consumers, contracts, and relevant tests before changing code.
- Preserve inputs, outputs, ordering, side effects, errors, validation, security, accessibility,
  and public contracts. Retain code if equivalent behavior cannot be established.
- Similar text alone is not enough: compare semantics, ownership, dependencies, and reasons for
  variation. Prefer existing shared code; do not create an abstraction that couples unrelated behavior
  or makes the result harder to understand.
- Stay within requested scope and preserve user changes. Load applicable project guidance and EV
  coding standards before code edits. No third-party skill or new tool installation is required.
- Default to staged, unstaged, and untracked non-ignored Git worktree changes; honor explicit scope.
  Inspect outside the scope to compare related implementations, not for unrelated findings or edits.
  If the worktree is clean, report no changes; if no Git repository or explicit scope is available,
  ask for scope.
- Examine the entire scope for duplication and simplification candidates; report every evidenced
  candidate, not a top-N selection.
- Combine compatible applicable skill instructions. Respect instruction hierarchy; surface unresolved
  conflicts before affected work rather than silently overriding another rule.

## Decision Gates

| Situation | Action |
| --- | --- |
| Shared behavior and ownership, equivalent contract, edits authorized | Consolidate using the smallest clear existing or new implementation. |
| Similar code with intentional differences or uncertain equivalence | Keep separate; explain the difference or evidence gap. |
| Find or review opportunities only | Report locations and evidence without edits. |

## Execution Steps

1. Establish scope and requested action; inspect callers, contracts, and tests.
2. Find related implementations with available project tools and compare behavior, including edge cases.
3. Make focused, behavior-preserving changes only when authorized; update affected consumers and tests.
4. Run relevant behavioral tests and project checks; report unavailable checks and remaining uncertainty.

## Output Contract

Report every candidate in chat with all relevant locations, evidence, behavioral differences or
uncertainty, and the smallest proposed fix; identify changes and retained cases. State scope, checks,
and gaps. If none are found, say so; do not claim exhaustive coverage when evidence is unavailable.
