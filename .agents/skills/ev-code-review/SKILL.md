---
name: ev-code-review
description: "Trigger: requested code review or standards check/fix. Run complete scoped reviews; expose coding rules to ev-coding-standards without automatic reviews."
license: Apache-2.0
metadata:
  author: "eduardovdev"
  version: "2.0"
---

# EV Code Review

## Activation Contract

For implementation, reuse full applicable rules through `ev-coding-standards` before code edits and
follow [implementation checks](references/generation-review.md) without automatic review. Reuse loaded unchanged
guidance; reload missing/changed rules. Concrete follow-up edits remain implementation, even when called
fixes or supplied after the user's own review. Formal execution/artifacts apply to requested reviews,
standards checks/fixes, or corrections to findings from a formal review, not ordinary completion.
For formal reviews, honor explicit scope/baseline; otherwise use staged, unstaged, and untracked
non-ignored working-tree changes.
The core works without technology companions.

## Hard Rules

- Read complete applicable references/companions, including exceptions; never substitute summaries or
  preferences. Prioritize correctness, security, accessibility, and data integrity.
- Remain read-only unless fixes are requested. Never stage, commit, or discard changes.
  Inspect check side effects; use the general verification policy for caches, artifacts, and isolation.
- Review in the current agent thread only. Never spawn subagents or parallel reviewers; perform
  applicable domain and technology checks sequentially.
- Report evidenced violations in scope; contextual inspection is not an unrelated audit. For diffs,
  report introduced/worsened violations; for whole-file/repository scopes, assess all authored scoped code.
- Classify behavior, runtime, imports, directives, and ownership—not extensions or installed dependencies
  alone. Tests follow their subject.
- Enforce the general environment-constants boundary; recommend missing modules/exports in read-only mode.
- Load applicable installed companions only; never auto-install or invent rules. Prefer project-level
  copies of the same name. Companions never launch reviews.

## Decision Gates

| Situation | Action |
| --- | --- |
| Explicit files, commits, branch diff, or PR | Use that scope; state its baseline. |
| Ordinary implementation/completion | Apply coding guidance and relevant project checks; no automatic review or coverage bookkeeping. |
| Concrete follow-up edits, such as removing a field or renaming a table | Continue implementation and check affected behavior/dependencies. |
| Requested review, standards check/fix, correction of formal-review findings, or formal report | Load and execute the formal workflow over the entire requested scope. |
| Default scope; clean working tree | Report no changes; do not switch to the latest commit. |
| No Git repository and no explicit scope | Ask for scope before reviewing. |
| UI/browser, server/data, shared, or mixed code | Load general plus frontend, backend, neither, or both respectively. |
| Any scope, including substantial or separable assignments | Review directly in the current agent thread; do not delegate. |

## Execution Steps

1. Use the formal workflow for requested review/check/fix work; implementation uses guidance and relevant checks only.
2. Resolve guidance, scope/baseline, code ownership, relevant context, and applicable full rules.
   Reuse unchanged full guidance already in the active context; load missing/new/changed references.
3. Execute in this thread. Explicit reviews require the [formal steps](references/formal-review.md)
   and coverage contract; implementation does not initiate these steps.
4. Apply the output contract below; distinguish performed checks, failures, and unavailable evidence.

## Output Contract

For explicit review/check/fix requests, display every finding directly in chat, ordered critical,
high, medium, low. Never truncate to five, a top-N selection, or a brevity budget; group long reports
with headings without omitting issues or deferring them to a file or follow-up request.
Include each finding's stable ID, severity, `path:line` and affected sites, rule section/wording,
evidence, impact, and smallest fix; distinguish style from behavioral defects. When fixes are requested,
state fixed/remaining status and verification evidence for each finding.
State scope/baseline, selected groups/rules, and single-thread execution. Finish with each planned
check's status/evidence, deterministic results, and coverage/verification gaps; state when none were found.
During code generation, report relevant check results without a separate standards report or full
compliance claim. Fix known in-scope issues before handoff; surface blockers, decisions, and material gaps.

## References

- [Formal review](references/formal-review.md): load for explicit review/check/fix requests, not ordinary generation.
- [Implementation checks](references/generation-review.md): coding guidance, relevant checks, follow-ups, and context recovery.
- [Generation workflow checks](references/generation-verification.md): behavioral regressions and paired cost/quality trials; load when verifying workflow changes.
- [General](references/general.md): always apply; shared code, security, and completion checks.
- [Frontend](references/frontend.md): UI/browser behavior, security, accessibility, and performance.
- [Backend](references/backend.md): server validation, access, data, and operational security.
- [Coverage](references/coverage.md): formal review check IDs, statuses, and validator contract; not required for generation.
