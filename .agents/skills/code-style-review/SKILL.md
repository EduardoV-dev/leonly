---
name: code-style-review
description: "Trigger: code review, review changes, CODE_STYLE.md compliance. Review code against bundled rules; default to the Git working tree."
license: Apache-2.0
metadata:
  author: "eduardovdev"
  version: "1.0"
---

# Code Style Review

## Activation Contract

Use for code reviews and code-style compliance reviews. Apply the user's explicit scope; otherwise
review staged changes, unstaged changes, and untracked non-ignored files in the Git working tree.

## Hard Rules

- Read [the complete bundled rules](references/code-style.md) before reviewing. Apply every relevant
  rule, including its exceptions; do not replace the rules with a summary or personal preferences.
- Prioritize correctness, security, accessibility, and data integrity over style.
- Remain read-only unless the user explicitly requests fixes. Never stage, commit, or discard changes.
- Report evidence-backed violations in scope. Read related code to verify behavior and ownership;
  do not turn contextual inspection into an unrelated repository-wide audit.
- For diffs, report violations introduced or worsened by the change. For explicit whole-file or
  repository reviews, assess all authored code in that scope.

## Decision Gates

| Scope | Action |
| --- | --- |
| Explicit files, commits, branch diff, or PR | Review exactly that scope and state its baseline. |
| No explicit scope | Review the working tree, including staged, unstaged, and untracked changes. |
| Clean working tree | Report no changes to review; do not switch to the latest commit. |
| No Git repository and no explicit scope | Ask for scope before reviewing. |

## Execution Steps

1. Resolve the repository root with `git rev-parse --show-toplevel` when using Git scope.
2. For default scope, run from the root:
   - `git status --short`
   - `git diff --cached --no-ext-diff --no-textconv --`
   - `git diff --no-ext-diff --no-textconv --`
   - `git ls-files --others --exclude-standard -z`
   Read untracked files directly. Inspect both diff layers without duplicating findings; include
   deletions and renames. Treat filenames safely, including spaces and unusual characters.
3. Read scoped code and relevant callers, contracts, tests, and configuration. Check each applicable
   section of the bundled rules, including physical line counts, ownership, and security boundaries.
4. Verify each candidate against actual behavior and documented exceptions. Recommend the smallest
   concrete fix; do not demand speculative abstractions.
5. Run relevant non-writing checks when available. Use the bundled completion commands for substantial
   web-app changes when applicable; in other repositories use their documented equivalents. Record
   failures, unavailable checks, and unverified behavior without claiming they passed.

## Output Contract

State scope and baseline, then list findings in severity order: critical, high, medium, low.
For each finding include `path:line`, the violated rule's section and wording, evidence or impact,
and the smallest recommended fix. Distinguish style violations from behavioral defects.
Finish with checks run and verification gaps. If no violations are found, say so explicitly.

## References

- [Code style rules](references/code-style.md): verbatim snapshot of `CODE_STYLE.md`, including all
  rules, exceptions, examples, and completion commands. Keep this copy synchronized when updating
  the skill's rules; the skill must remain usable without the original repository document.
