# Apply Standards Without An Automatic Review

Use this workflow for ordinary implementation and concrete follow-up edits. Load and apply full
applicable standards as coding guidance; do not run a comprehensive code review unless requested.
Requested standards checks/fixes use the standards check-and-fix workflow over the requested scope.
Use other skills for functional reviews.

## Implement And Check Behavior

1. Inspect the task scope, existing user changes, relevant callers/contracts/tests, and project tooling.
   Load complete applicable rules before affected edits. Reuse unchanged guidance; load newly applicable
   or changed guidance when scope or sources change. Resolve missing required rules and policy conflicts.
2. Implement the requested behavior using those rules. Preserve correctness, security, accessibility,
   and data integrity. Address defects encountered in scope; do not postpone known issues until review.
3. Run relevant documented tests, lint/format checks, type checks, and builds as appropriate to the
   change, following the general verification policy. Check affected consumers and integration when
   contracts, shared configuration, authorization, or build inputs change. Reuse successful results
   only while they cover the completed state; rerun affected checks after relevant changes.
4. At handoff, report what works, performed checks, and material verification gaps. Do not claim full
   standards compliance or comprehensive defect detection from automated checks alone.

Do not require coherent-unit review passes, exhaustive per-rule assessment, review-evidence ledgers,
formal coverage artifacts, validator runs, or final review-coverage reconciliation during implementation.
Relevant implementation checks remain required; deferring review does not mean deferring testing.

## Continue Follow-Up Edits

Concrete instructions such as removing a field, renaming a table, or correcting behavior remain
implementation, even when called fixes or supplied after the user's own review. Inspect the current
working state, preserve unrelated work, and check changed behavior and affected dependencies. Do not
automatically review either the follow-up delta or the entire original implementation.

Retain enough task context to identify an explicitly requested follow-up delta; clarify an unavailable
baseline rather than silently substituting the full dirty tree.

## Resume After Context Loss

Retain task scope, guidance paths/source identities, changes, completed commands, and pending work in
permitted session state. After compaction, inspect current sources/changes, reload missing full rules,
and verify that retained check results still apply before reuse. A summary is neither rule text nor
proof of a successful check. No per-unit review records are required.
