---
name: ev-coding-standards
description: "Trigger: coding, implementing, checking standards, updating skills. Load applicable installed EV standards before edits and manage check/fix/update workflows."
license: Apache-2.0
metadata:
  author: "eduardovdev"
  version: "1.0"
---

# EV Coding Standards

## Activation Contract

Load before implementing or changing code, and for standards check, fix, or update requests.
Use the selected installed skills and their bundled references as the rule source.

## Hard Rules

- Read [pre-coding](references/pre-coding.md) before the first code edit and whenever scope expands.
- Reuse full guidance already loaded in the active context; reload only missing/changed guidance.
  Apply rules as implementation guidance and run relevant project checks; do not automatically review
  work units or track review coverage. Explicit standards checks use the check/fix workflow.
- Read full applicable rules, including exceptions. Do not copy rules into project instructions or
  infer requirements from names alone. Preserve correctness, security, accessibility, and data integrity.
- Work in the current agent thread only. Never spawn subagents or parallel reviewers; perform coding,
  checks, and reviews sequentially.
- Keep check read-only. Fix only requested scope; never stage, commit, discard, or publish application
  changes as a side effect. Plan-mode requests remain read-only.
- Resolve skills through the harness or installed project/user skill directories, with references
  relative to each selected skill. Normal implementation, check/fix, and project wiring must not search
  for, clone, or require the upstream repository or inspect its Git state. Record available installed
  metadata; unavailable source provenance is not a blocker. Repository access belongs only to explicitly
  requested repository maintenance; setup/update requirements do not apply to ordinary skill use.

## Decision Gates

| Request | Action |
| --- | --- |
| Implement/change code | Follow pre-coding, then implement the requested scope. |
| Concrete follow-up edits after implementation or the user's own review | Continue implementation and check affected behavior; do not automatically start a review. |
| Check/fix standards | Follow [check and fix](references/check-and-fix.md). |
| Update installed standards | Follow [update](references/update.md). |
| Missing/conflicting required guidance | Report exact paths and the gap; resolve before affected edits. |

## Execution Steps

1. Resolve this installed skill's directory, task scope, and project guidance; do not locate an upstream checkout.
2. Read the selected workflow, its applicable rules, and the [workflow examples](references/examples.md)
   before acting. Respect explicit decisions already supplied, and preserve the API pagination decision gate.
3. Run scoped verification; distinguish successful checks, violations, and unavailable evidence.

## Output Contract

For explicit check/fix requests, show every
finding with severity, evidence, impact, minimal fix, and fixed/remaining status when applicable.
Include scope, installed rule paths/available metadata, results, and verification gaps.
During generation, record rule selection and completion checks internally; do not emit a separate
standards report or summary. Surface blockers, required decisions, and material verification gaps.
For explicit setup/update, report the actual installation method, changed revision/links when available,
and restart requirements.

## References

- [Pre-coding selection](references/pre-coding.md)
- [Check and fix](references/check-and-fix.md)
- [Update](references/update.md)
- [Workflow examples and exceptions](references/examples.md)
- [Management helper](assets/manage.py)
