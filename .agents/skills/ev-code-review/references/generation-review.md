# Incremental Verification During Generation

Use this workflow for ordinary implementation. Apply the same full authoritative rules as explicit
review; change execution and bookkeeping, not substantive coverage. Explicit review/check/fix requests,
including requests for a formal review report during generation, use the coordinator's formal workflow
and coverage contract over the entire requested scope.

## Load Once Per Active Context

Resolve guidance and read complete applicable skill bodies, references, and exceptions before affected
edits. Reuse text already available in the active context; do not reload it per file, edit, or work unit.
Record exact resolved paths, source revision/dirty state, and applicable domains/technologies once.
Preserve project-local precedence; never silently mix incompatible sources.

| Change | Required action |
| --- | --- |
| Another file under the same guidance and scoped usage | Reuse loaded rules; no new activation or review ceremony. |
| New responsibility, technology, ownership, or nested guidance | Reselect; load only newly required guidance before affected edits. |
| Rule source/path/version changes | Reload affected full guidance and invalidate evidence depending on it. |
| Compaction removes required rule text, or source identity is uncertain | Verify sources and reload missing full text before affected work. |

Check source freshness at work-unit boundaries and after external edits or compaction, not before each
statement. A Git revision alone does not identify dirty or non-Git rule files; compare relevant content
with the loaded version when needed. Discovery metadata and continuation summaries never replace rules.

## Implement, Then Review A Coherent Unit

1. Establish the task baseline and distinguish pre-existing user work. Group implementation by behavior
   and dependencies, such as an endpoint, its consumers, and its tests; do not impose file-count quotas.
   A small task may be one unit. Apply loaded rules while writing; do not launch the coordinator after
   individual edits or files.
2. When a unit is ready, inspect its complete change against the baseline and relevant
   callers/contracts/tests. Include new files, deletions, and renames. Evaluate every applicable general,
   domain, and technology rule in one integrated pass rather than rereading the unit for each group.
   Sampling files or dropping security, accessibility, correctness, or data-integrity checks is forbidden.
3. Run relevant documented project checks under the applicable verification policy. Reuse valid results
   from implementation instead of rerunning identical commands for completion. Existing automated checks
   can supply evidence only for what they actually establish; retain semantic checks they do not cover.
4. Fix in-scope findings, then recheck affected changes and dependent behavior. Preserve unrelated work
   and scope restrictions. Do not stop with unresolved findings merely to meet a time or iteration budget;
   surface actual blockers and material verification gaps.

## Keep Evidence Small And Specific

Maintain one compact internal record per unit, updated rather than appended after every edit:

| Field | Required contents |
| --- | --- |
| Scope/state | Baseline, reviewed paths/change identity, relevant dependencies and contracts. |
| Rules/checks | Resolved rule sources; applicable checks assessed, evidence and PASS/FAIL/NOT_APPLICABLE/UNVERIFIED status; reasons for exclusions. |
| Findings | Open/fixed defects and affected sites; verification of fixes. |
| Commands | Commands, scope, results, and code/configuration/environment state they cover. |
| Pending | Unreviewed changes, invalidated evidence, integration checks, and limitations. |

Check IDs from the formal coverage inventory may label results, but plan/results JSON files, the
coverage validator, and a separate user-facing review report are not required during generation.
Do not create repository tracking files or a new framework for these records. Use existing permitted
session/task state; retain enough evidence to distinguish performed checks from assumptions.

## Invalidate By Dependency, Not By Habit

Reuse evidence only while the reviewed code, applicable rules, relevant dependencies, configuration,
and environment remain compatible with that evidence. Identify the reviewed state with an existing
diff/snapshot or content identity; `HEAD` or a path list alone is insufficient for uncommitted edits.
Retain code/evidence itself or a recoverable location, not merely a hash with no supporting inspection.

- A local implementation fix invalidates its review and affected tests, not every unrelated unit.
- Changed exports, schemas, shared types, or API contracts invalidate dependent consumers and integration
  checks even when those consumers' files are unchanged.
- Authorization, trust boundaries, shared configuration, build inputs, or environment changes require
  broader checks across affected units. A rule change invalidates checks governed by that rule.
- If impact or prior evidence cannot be established, inspect dependencies and expand the recheck;
  never interpret uncertainty as a pass. Static review and command results can have different scopes.

## Finish With Integration, Not A Restart

Compare the final task diff with the unit records. Every changed file and applicable check must be
covered by current evidence, including deletion/rename effects; review uncovered or invalidated changes.
Check cross-unit contracts and end-to-end behavior. For substantial tasks, run the general completion
checklist's applicable lint/format, typecheck, tests, and build when available, reusing only results
covering the final relevant state. Unit tests alone do not establish integration correctness.

Do not repeat a full already-valid unit review or rerun a valid check merely because the task is ending.
Keep completion evidence internal; surface unresolved blockers, decisions, and material gaps. An explicit
review request still requires the complete formal review of its requested scope, not checkpoint substitution.

## Resume After Compaction

Before compaction when possible, retain a continuation record in permitted session state: task baseline,
resolved rule paths/source identities, unit records and recoverable evidence, current findings, pending
changes, invalidated checks, and integration work. Follow higher-priority persistence instructions.

After compaction, verify the current diff and source identities against that record. Reload required
full guidance no longer available; load newly applicable guidance too. Recover the underlying evidence
before reusing a result. Recheck missing, stale, or unverifiable evidence and continue pending work;
do not automatically restart every review or treat a checkpoint summary as proof of compliance.
