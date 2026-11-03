# Verify Generation Quality And Cost

Use disposable task fixtures and fresh agent sessions to verify the generation workflow. Static link,
metadata, and helper tests cannot prove compliance or preserved defect detection. Do not run these
behavioral scenarios on a user's application as a side effect of ordinary implementation.

## Behavioral Regression Matrix

Record the fixture revision, task prompt, loaded source revision/dirty state, agent/model/configuration,
and trace location. Keep expected defects separately from the implementing agent's prompt. A reviewer
of the resulting trace must distinguish actual inspection/checks from unsupported compliance claims.

### Activation And Scope

| Scenario | Required trace evidence |
| --- | --- |
| Change several files in one behavior unit | Full applicable rules load before edits, remain available, and are reused; one integrated unit review follows readiness, not each edit. |
| Cross into a new domain/technology or nested instruction scope | Newly applicable full guidance loads before affected edits; unrelated loaded guidance is reused. |
| Required reference is missing, or project/global sources conflict | Exact gap/conflict is surfaced before affected edits; no inferred rules or silent version mixing. |
| Applicable rule changes without changing source HEAD | Changed rule content is detected at the next boundary; affected full guidance reloads and dependent evidence is invalidated. |

### Coverage And Invalidation

| Scenario | Required trace evidence |
| --- | --- |
| Add, delete, and rename files across units | Final reconciliation accounts for every changed file and affected callers; no file sampling or unrelated cleanup. |
| Fix one reviewed local function while another unit is unchanged | Affected review/tests rerun; unrelated current evidence is reused rather than restarted. |
| Change an exported type/schema/API after reviewing its consumers | Unchanged dependent consumers and integration checks are revisited; unchanged consumer paths do not imply valid evidence. |
| Change authorization/shared config/build inputs/environment | All affected units/checks are reconsidered, with broader verification where necessary. |
| Prior evidence is missing, or dependency impact is uncertain | Evidence is recovered or checks expand/rerun; uncertainty is not recorded as PASS. |

### Completion And Reporting

| Scenario | Required trace evidence |
| --- | --- |
| Generate code with observable behavioral and style defects | Applicable rules catch the seeded defects, verify fixes, and preserve exceptions; ordinary completion has compact evidence, no mandatory formal JSON/validator or separate report. |
| Unit checks pass but a cross-unit contract is broken | Final integration detects the mismatch; unit success alone cannot complete the task. |
| Check succeeded, then its covered code/configuration changed | Stale results are not reused; final evidence covers the relevant completed state. |
| Tests/build are unavailable | Concrete missing evidence is surfaced; no claimed compliance or invented successful checks. |
| Explicit review/check/fix, including a review report requested during generation | Full formal plan/results/validator workflow covers the entire requested scope, not checkpoints alone; every finding is reported, including more than five, with fixed/remaining status for fixes. |

### Compaction Recovery

| Scenario | Required trace evidence |
| --- | --- |
| Compact after one completed unit; change nothing externally | Continuation includes baseline, sources, recoverable evidence, findings, and pending checks; missing full rules reload and valid recovered evidence is reused. |
| Edit code/rules externally during compaction | Current sources/diff are compared with retained identities; affected guidance reloads and dependent evidence is invalidated. |
| Resume with only a summary/hash and no recoverable review evidence | Summary is not treated as rule text or proof; missing evidence is reinspected without blindly restarting unrelated verified units. |

## Paired Cost And Quality Comparison

1. Choose representative fixtures: a small single-unit task and a multi-unit task with shared contracts,
   plus the compaction scenario above. Record known defects/expected behavior and supported exceptions
   before running. Use the same task baseline/prompt, tool access, model/settings, and check environment
   for both the previous workflow and the candidate; isolate their working copies and agent contexts.
2. Capture each run's elapsed time, input/output tokens and cached tokens when available, rule-read
   count, repeated review/check count, compactions, and final verification results. Distinguish tool/check
   latency from model time when traces permit; mark unavailable metrics rather than estimating them.
3. Compare detected/missed expected defects, false positives on approved exceptions, final behavior,
   unreviewed files/checks, and stale evidence reused. Include contract/security/accessibility cases
   when applicable. Use existing test outcomes and trace inspection, not the coverage validator alone.
4. Report each paired run, not only an aggregate. Repeat pairs with alternating run order if variability
   prevents a useful comparison. Retain trace locations and conditions so differences are attributable;
   do not claim statistical certainty or extrapolate one fixture to every repository.
5. Accept the workflow only with no known fixture-detection regression, complete current coverage, and
   observed reduction in redundant work/cost. Investigate misses or stale-evidence reuse before rollout.
   No executed comparison means savings and quality parity remain UNVERIFIED; report that explicitly.

Use existing permitted task/session storage for traces and results. Do not add a benchmark framework,
install dependencies, or invent numerical speedup/quality claims to satisfy this protocol.
