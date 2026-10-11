---
name: ev-code-review
description: "Trigger: code review, review changes, code-style compliance. Route shared, frontend, backend, and installed technology rules; coordinate scoped reviewers."
license: Apache-2.0
metadata:
  author: "eduardovdev"
  version: "2.0"
---

# EV Code Review

## Activation Contract

Review explicit scope; otherwise staged, unstaged, and untracked non-ignored working-tree changes.
The core works without technology companions.

## Hard Rules

- Read complete applicable references/companions, including exceptions; never substitute summaries or
  preferences. Prioritize correctness, security, accessibility, and data integrity.
- Remain read-only unless fixes are requested. Never stage, commit, or discard changes.
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
| Small/tightly coupled scope or no delegation support | Review directly. |
| Substantial scope with independent assignments | Use up to three parallel scoped reviewers. |

## Execution Steps

1. Resolve Git scope with `git rev-parse --show-toplevel`. For default scope, run from the root:
   `git status --short`, `git diff --cached --no-ext-diff --no-textconv --`,
   `git diff --no-ext-diff --no-textconv --`, and `git ls-files --others --exclude-standard -z`.
   Read untracked files; include deletions/renames, handle filenames safely, and deduplicate diff layers.
2. Read guidance, manifests, configuration, scoped code, and relevant callers/contracts/tests. Assign
   file domains/technologies. Server rendering alone is frontend; server operations require backend too.
3. Read core references. Discover companions from harness skill lists/registries, otherwise known
   project/user locations (`.agents/skills`, `.opencode/skills`, `~/.config/opencode/skills`). Resolve
   exact paths; never assume sibling installation.
   Match `ev-review-typescript`, `ev-review-react`, `ev-review-nextjs`, `ev-review-nestjs`,
   `ev-review-postgres`, and `ev-review-supabase` (also PostgREST) to scoped usage; read their
   applicability conditions. Report detected technologies lacking installed coverage, including
   unknown ones; continue with core rules.
4. Review directly or assign frontend, backend, and—when warranted—cross-cutting contracts/security
   reviewers. Include shared-only changes; create only useful assignments. Pass exact scope/baseline,
   file ownership, rule paths, contextual-read permission, and read-only/output contracts. Everyone
   applies general/security rules; forbid nested delegation. Allow cross-assignment contextual reads.
   Run shared checks once through the coordinator.
5. Verify behavior/exceptions; deduplicate defects while retaining affected sites. Recommend minimal
   fixes without speculative abstractions. Check physical line counts/ownership. Run documented
   non-writing checks selected by completion lists; record failures, unavailable checks, incomplete
   reviewer assignments, and unverified behavior.

## Output Contract

State scope/baseline, applied rules, and direct/parallel mode. Order findings: critical, high, medium,
low. Include `path:line`, rule section/wording, evidence/impact, and smallest fix; distinguish style
from behavioral defects. Finish with checks and coverage/verification gaps. State when no violations
were found.

## References

- [General](references/general.md): always apply; shared code, security, and completion checks.
- [Frontend](references/frontend.md): UI/browser behavior, security, accessibility, and performance.
- [Backend](references/backend.md): server validation, access, data, and operational security.
