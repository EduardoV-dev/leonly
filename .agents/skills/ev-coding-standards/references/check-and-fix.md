# Check And Fix

Use this workflow for requested standards checks/fixes and corrections to existing findings.
Concrete implementation instructions, even called fixes or supplied after the user's own review,
follow pre-coding guidance and relevant implementation checks instead; do not automatically start a review.

## Check

- Load `ev-code-rules` and applicable domain rules, and relevant technology companions.
- Honor explicit files, repository scope, commits, branch baseline, or PR. Otherwise inspect staged,
  unstaged, and untracked non-ignored changes. A clean tree means no changes, not the latest commit.
- Record exact installed rule paths and available metadata; do not locate an upstream checkout or
  require its Git revision/dirty state. Keep inspection read-only;
  inspect scripts/CI and apply the core's general read-only verification policy before running checks.
  Redirect artifacts/caches or isolate execution only when permitted; report unavailable checks as gaps.
- Display every finding directly in chat with severity, location, rule, evidence,
  impact, and minimal-fix fields. Never truncate to five or another top-N subset.

## Fix

1. Establish the same scope/baseline and read full applicable rules before editing. When the user asks
   to fix findings from a completed review, reuse that review's findings and baseline; verify they still
   apply to the current code rather than repeating the initial review. If the findings or baseline are
   unavailable or ambiguous, ask for them. Otherwise check the requested scope first. Fix only evidenced
   violations in requested scope. Existing user changes are not disposable.
2. Apply the smallest consistent correction, including affected callers/imports/contracts/tests.
   Preserve exceptions, public behavior, and security controls. Resolve ambiguous policy intent before
   affected edits; API pagination implementation still requires the user's choice. Necessary caller
   updates do not override explicit file restrictions; ask before editing outside those restrictions.
3. Run relevant checks. Formatter write modes are allowed only for requested fix scope; otherwise
   preserve the review's verification policy and respect runtime restrictions. Recheck the resulting
   diff against the original baseline.
4. Return every fixed and remaining finding in chat with its severity, location, rule, evidence,
   impact, correction or recommended fix, and verification status, plus checks and gaps.
   Do not claim compliance when a check could not run. Do not stage, commit, discard, or publish
   application changes.
