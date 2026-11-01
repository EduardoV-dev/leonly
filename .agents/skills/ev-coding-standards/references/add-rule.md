# Contribute Rules Without Losing Upstream Changes

## Before Any Rule Edit

The workflow below is the default. If the user explicitly authorizes direct edits in the original
checkout for the current task, edit there without requiring a clean checkout, creating a worktree,
or pulling over local work. Preserve existing changes, read applicable guidance, and run scoped
validation. This exception does not authorize commits, publication, or global activation; report the
actual checkout/revision and activation state. See the [workflow examples](examples.md).

1. Resolve the active source checkout. Require a clean `main` and the expected origin. Choose a short
   lowercase kebab-case slug describing the rule, then run:

   ```bash
   python3 <resolved-ev-coding-standards-directory>/assets/manage.py start-rule <slug>
   ```

   The helper pulls latest into `main`, creates `rules/<slug>` from `origin/main` in the sibling
   `<repo-name>-worktrees/<slug>`, and pulls latest there again before returning. It refuses existing
   branches/paths. If it fails, inspect and report the retained state; never delete work to retry.
2. Read that worktree's current guidance and complete applicable skills/references. Identify the
   existing rule owner and duplicate/contradictory requirements before editing. Clarify unresolved
   policy intent. Broaden an existing rule instead of creating a parallel source of truth.
3. Edit only the contribution worktree. Maintain `ev-` names, frontmatter/activation contracts, local
   references, exceptions, coverage IDs/results, and docs when affected. Add a skill only for genuinely
   new coverage. Global links remain attached to the active checkout's `main`.

## Validate And Publish

1. Run `python3 <worktree>/skills/ev-coding-standards/assets/manage.py validate`, the affected tests,
   and `npx skills add . --list` from the worktree. Inspect status/diff and recent commit style.
2. When committing/publication is authorized, commit the scoped contribution. Fetch `origin` again
   before publishing. For an unpublished branch, rebase onto current `origin/main`; resolve both
   textual and semantic rule conflicts, then rerun affected validation. Never edit away a concurrent
   rule just to make the merge succeed.
3. Publish with a normal push and open a PR against current `main` when authorized. For an already
   published branch, merge `origin/main` and push normally; do not rewrite shared history. If another
   writer advances the contribution branch, fetch/merge it too, revalidate, and retry a normal push.
4. If upstream moves again or the PR becomes outdated, reconcile and validate again. Stop after two
   unsuccessful reconciliation rounds or on ambiguous policy intent; report the exact conflict and
   preserve the branch/worktree. Never force-push, reset, or auto-stash.
5. Contributions become globally active only after merge and `ev-update`. Do not repoint global links
   to an unmerged branch. Report validation, branch/worktree, PR/publication state, and activation state.

Without an explicit direct-edit exception, if the source checkout is dirty (including an uncommitted
setup), stop before starting a contribution; the owner must resolve that work first. Never commit
unrelated work to unblock this workflow. These contribution prerequisites do not block unrelated
application implementation; record the loaded standards revision/dirty state and resolve relevant
guidance conflicts before affected edits.
