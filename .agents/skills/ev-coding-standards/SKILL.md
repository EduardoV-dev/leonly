---
name: ev-coding-standards
description: "Trigger: coding, implementing, fixing, ev-check, ev-fix, ev-update, ev-add-rule. Load applicable EV standards before edits and manage their global workflows."
license: Apache-2.0
metadata:
  author: "eduardovdev"
  version: "1.0"
---

# EV Coding Standards

## Activation Contract

Load before implementing or changing code, and for standards check, fix, update, or add-rule requests.
Use `EduardoV-dev/my-skills` as the authoritative rule source; installed skills expose its local files.

## Hard Rules

- Read [pre-coding](references/pre-coding.md) before the first code edit and whenever scope expands.
- Reuse full guidance already loaded in the active context; reload only missing/changed guidance.
  Apply rules as implementation guidance and run relevant project checks; do not automatically review
  work units or track review coverage. Explicit review/check/fix requests use the full formal workflow.
- Read full applicable rules, including exceptions. Do not copy rules into project instructions or
  infer requirements from names alone. Preserve correctness, security, accessibility, and data integrity.
- Work in the current agent thread only. Never spawn subagents or parallel reviewers; perform coding,
  checks, and reviews sequentially.
- Keep check read-only. Fix only requested scope; never stage, commit, discard, or publish application
  changes as a side effect. Plan-mode requests remain read-only.
- Keep the active source checkout on `main`; use sibling worktrees for rule contributions unless the
  user explicitly authorizes direct edits for the current task. For the normal contribution workflow,
  pull latest before rule edits and reconcile upstream again before publication. A direct-edit exception
  does not authorize discarding work, publication, or global activation.

## Decision Gates

| Request | Action |
| --- | --- |
| Implement/change code | Follow pre-coding, then implement the requested scope. |
| Concrete follow-up edits after implementation or the user's own review | Continue implementation and check affected behavior; do not automatically start a review. |
| Check/fix standards | Follow [check and fix](references/check-and-fix.md). |
| Update installed standards | Follow [update](references/update.md). |
| Add/change a standard | Follow [rule contributions](references/add-rule.md). |
| Missing/conflicting required guidance | Report exact paths and the gap; resolve before affected edits. |

## Execution Steps

1. Resolve this skill's real path, the source checkout, task scope, and project guidance.
2. Read the selected workflow, its applicable rules, and the [workflow examples](references/examples.md)
   before acting. Respect explicit decisions already supplied, and preserve the API pagination decision gate.
3. Run scoped verification; distinguish successful checks, violations, and unavailable evidence.

## Output Contract

For explicit check/fix requests, follow the review coordinator's exhaustive chat report: show every
finding with severity, evidence, impact, minimal fix, and fixed/remaining status when applicable.
Include scope, source revision/dirty state, loaded paths, results, and verification gaps.
During generation, record rule selection and completion checks internally; do not emit a separate
standards report or summary. Surface blockers, required decisions, and material verification gaps.
For maintenance, report changed revision/links or the contribution worktree and publication state.

## References

- [Pre-coding selection](references/pre-coding.md)
- [Check and fix](references/check-and-fix.md)
- [Update](references/update.md)
- [Rule contributions](references/add-rule.md)
- [Workflow examples and exceptions](references/examples.md)
- [Management helper](assets/manage.py)
