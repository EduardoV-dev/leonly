---
name: ev-code-review
description: "Trigger: code review, code generation standards, code-style compliance. Supply pre-coding rules and run scoped reviews sequentially."
license: Apache-2.0
metadata:
  author: "eduardovdev"
  version: "2.0"
---

# EV Code Review

## Activation Contract

For implementation, reuse the applicable rules through `ev-coding-standards` before code edits;
review execution and coverage artifacts apply when reviewing, including the completion review.
Review explicit scope; otherwise staged, unstaged, and untracked non-ignored working-tree changes.
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
| Default scope; clean working tree | Report no changes; do not switch to the latest commit. |
| No Git repository and no explicit scope | Ask for scope before reviewing. |
| UI/browser, server/data, shared, or mixed code | Load general plus frontend, backend, neither, or both respectively. |
| Any scope, including substantial or separable assignments | Review directly in the current agent thread; do not delegate. |

## Execution Steps

1. Resolve Git scope with `git rev-parse --show-toplevel`. For default scope, run from the root:
   `git status --short`, `git diff --cached --no-ext-diff --no-textconv --`,
   `git diff --no-ext-diff --no-textconv --`, and `git ls-files --others --exclude-standard -z`.
   Read untracked files; include deletions/renames, handle filenames safely, and deduplicate diff layers.
2. Read guidance, manifests, configuration, scoped code, and relevant callers/contracts/tests. Assign
   file domains/technologies. Server rendering alone is frontend; server operations require backend too.
3. Read core references. Discover companions from harness skill lists/registries, otherwise known
   project/user locations (`.agents/skills`, `.opencode/skills`, `~/.agents/skills`,
   `~/.config/opencode/skills`, `~/.claude/skills`). Resolve
   exact paths; never assume sibling installation.
   Match `ev-review-typescript`, `ev-review-react`, `ev-review-nextjs`, and `ev-review-nestjs` to scoped
   usage; read their applicability conditions. Report detected technologies lacking installed coverage,
   including unknown ones; continue with core rules.
4. Create an internal review plan before analysis: list each applicable domain/technology check ID from
   [Coverage](references/coverage.md). Unselected technologies need no placeholder results; every planned
   check needs a result, including `NOT_APPLICABLE` if later found inapplicable. Include shared-only changes. Keep
   the plan and all analysis in this agent thread; do not create subagents or delegate assignments.
   Run shared checks once, then domain and technology checks sequentially, applying general/security
   rules throughout. Read contextual files as needed within the requested scope.
5. Evaluate each planned check directly and record one result using the coverage contract; findings
   include stable IDs and evidence. Do not treat omitted checks as passes.
6. Verify behavior/exceptions; deduplicate defects while retaining affected sites. Recommend minimal
   fixes without speculative abstractions. Check physical line counts/ownership. Run documented
   checks permitted by the general read-only verification policy; record failures, unavailable checks,
   incomplete check groups, and unverified behavior. Challenge high-risk findings and `UNVERIFIED` checks
   in this agent by checking callers, exceptions, and counterexamples. Do not spawn another reviewer or
   describe this self-check as independent review; state that independent review was not performed.
7. Validate the plan against reviewer results with `python <path-to-ev-code-review>/assets/validate_coverage.py
   --plan <plan.json> --results <results.json>` when files and Python are available. Do not create or
   modify repository files for review artifacts. If unavailable, manually compare every planned ID and
   report that deterministic validation was unavailable.

## Output Contract

State scope/baseline, selected check groups, applied rules, and that review ran in one agent thread.
Order findings:
critical, high, medium, low. Include `path:line`, rule section/wording, evidence/impact, and smallest
fix; distinguish style from behavioral defects. Finish with each planned check's status and evidence,
deterministic-check results, and coverage/verification gaps. State when no violations were found.

## References

- [General](references/general.md): always apply; shared code, security, and completion checks.
- [Frontend](references/frontend.md): UI/browser behavior, security, accessibility, and performance.
- [Backend](references/backend.md): server validation, access, data, and operational security.
- [Coverage](references/coverage.md): stable check IDs, evidence statuses, and validator input contract.
