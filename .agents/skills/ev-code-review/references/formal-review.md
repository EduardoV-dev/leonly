# Execute An Explicit Review

Load for requested reviews, standards checks/fixes, or corrections to findings from a formal review,
including a formal review report requested during code generation. Concrete follow-up implementation
edits alone use coding guidance and relevant implementation checks. Preserve the coordinator's scope,
constraints, and exhaustive output contract. Implementation checks do not replace this workflow over
the entire requested scope.
Honor an explicit follow-up delta baseline; do not replace it with the full dirty working tree.

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
   [Coverage](coverage.md). Unselected technologies need no placeholder results; every planned
   check needs a result, including `NOT_APPLICABLE` if later found inapplicable. Include shared-only changes.
   Keep the plan and all analysis in this agent thread; do not create subagents or delegate assignments.
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
