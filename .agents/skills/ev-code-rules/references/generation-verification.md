# Verify Implementation And Review Activation

Use disposable task fixtures and fresh agent sessions to verify this workflow. Static link, metadata,
and helper tests cannot prove agent behavior or defect detection. Do not change a user's application
as a side effect of testing these scenarios.

Record fixture revision, task prompt, installed rule paths/available metadata, agent/model/configuration,
and trace location. Do not locate an upstream checkout to obtain provenance; unavailable source revisions
do not block execution. Keep expected behavior separately from the implementing agent's prompt.

## Behavioral Regression Matrix

| Scenario | Required trace evidence |
| --- | --- |
| Implement/check/fix or wire a project using installed copies without an upstream checkout | Complete applicable rules load from installed directories; references resolve there. No upstream checkout search, clone, or Git provenance commands occur; unavailable source revisions do not block work. |
| Implement several files without requesting review | Full applicable rules load before edits and guide implementation; relevant project checks run. No unit-review pass, exhaustive per-rule assessment, evidence ledger, coverage JSON/validator, or final review-coverage reconciliation. |
| Cross into a new technology/domain or nested instruction scope | Newly applicable full guidance loads before affected edits; unchanged guidance is reused. |
| Required reference is missing or sources conflict | Exact gap/conflict is surfaced before affected edits; no invented rules or silent version mixing. |
| EV cleanup skills installed without third-party skills | Requested cleanup loads its applicable EV rules and works without installing or locating third-party skills. |
| EV simplification and a compatible third-party simplification skill both apply | Applicable compatible instructions are combined; behavior, scope, and EV standards remain intact without duplicate review workflows. |
| Third-party workflow requires commits or parallel reviewers while EV/harness rules forbid them | Governing instruction wins; absent a governing priority, name the conflicting sources and stop before the affected action for a decision. Do not commit or delegate implicitly. |
| Find unused code with dynamic entry points or external consumers | Report evidence and retain uncertain code; identification alone makes no edits. |
| Deduplicate similar code with differing errors or side effects | Keep the differing implementations unless equivalence is established; run relevant behavioral checks for authorized changes. |
| Cleanup requested without scope on a Git worktree with staged, unstaged, and untracked changes | Assess all changed code, inspect external consumers or related implementations as context, and report every evidenced candidate and proposed fix without expanding edits. |
| Cleanup requested without scope on a clean worktree or outside Git | Report no changes on a clean worktree; outside Git ask for scope. Never silently switch to the latest commit or the entire repository. |
| Unused export, dynamic handler, or side-effect import has unknown consumers | Retain it and report the evidence gap and proposed safe next step. |
| More than five cleanup candidates, including duplicates with behavioral differences | Report all candidates with locations, evidence, differences or uncertainty, and proposed fixes; do not truncate. |
| Applicable rule source changes, including dirty edits without a new HEAD | Affected full guidance reloads before further affected work; no assumption that unchanged HEAD means unchanged rules. |
| Add/delete/rename files or change a shared contract | Implementation updates affected usages, consumers, tests, and links as appropriate; relevant integration is checked without a review-coverage ledger. |
| User requests concrete fixes affecting 30 files after their own review of a 100-file implementation | Implementation continues; affected behavior/dependencies are checked without automatic delta or full-feature review. |
| A successful check's covered code/configuration changes | Affected checks rerun; unrelated results are reused only while still valid. |
| Tests pass locally but affected integration fails | Failure is fixed in scope or surfaced as a blocker; local test success is not claimed as integration success. |
| Known in-scope correctness/security/accessibility issue is encountered | Issue is addressed or surfaced as blocked; deferring comprehensive review does not permit knowingly broken implementation. |
| Tests/build unavailable, or style defects are not covered by tools | Material gaps are reported; automated success is not described as full standards compliance. No exhaustive manual style review is automatically substituted. |
| Explicit standards check/fix | Standards checks cover the requested scope and report every finding, with fixed/remaining status for fixes; functional reviews use other skills. |
| After a completed review, user says "fix them all" | Reuse the review's findings and original scope/baseline, verify they still apply, fix them, and recheck; do not repeat the initial review. Ask for missing or ambiguous findings/baseline. |
| User requests review before accepting the implementation | Requested review runs immediately; acceptance is not an extra prerequisite. |
| User requests "review these corrections", then "review the whole feature" | First review uses the identifiable follow-up delta/dependencies; second uses the full feature scope. Clarify an unavailable explicit baseline rather than substituting the full dirty tree. |
| Compact context, with or without external edits | Task/check context and source identities are retained; current state is verified, missing full rules reload, and stale/unverifiable check results are not reused. No unit-review records are required. |

## Cost And Quality Comparison

1. Use representative small, multi-file/shared-contract, and follow-up fixtures. Compare the previous
   and candidate workflows with the same baseline, prompt, model/settings, tools, and environment in
   isolated working copies and fresh contexts. Include an explicit review request after implementation.
2. Capture elapsed time, tokens/cached tokens when available, rule-read counts, automatic review passes,
   repeated checks, and final behavioral results. Distinguish implementation from requested-review cost.
3. Compare requested behavior, relevant check execution, known defects, false positives, and stale
   results reused. Assess exhaustive review coverage only in the explicitly requested review phase;
   do not require generation-time defect-detection parity with a comprehensive review.
4. Report each paired run and trace location; repeat when variability prevents useful comparison.
   Without executed trials, savings and fresh-session behavior remain UNVERIFIED. Do not invent speedup
   or quality claims from shorter instructions or passing helper tests.

Use permitted session/task storage for traces. Do not add a benchmark framework or install dependencies.
