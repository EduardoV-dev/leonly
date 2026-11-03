# Standards Workflow Examples And Exceptions

Use these scenarios with the selected workflow and full applicable rules. They illustrate decisions,
not commands to execute or permission to expand a task. Implementation examples belong in their owning
technology skills.

## Select Rules From The Actual Work

```text
Task: Fix calculateOrderTotal() in a plain TypeScript utility.

// Avoid:
Load React, Next.js, and NestJS rules because those dependencies are installed.

// Prefer:
Load general and TypeScript rules.
Inspect relevant callers and tests without expanding the requested fix.
```

```text
Task expands: Update the checkout component to display the corrected total.

// Avoid:
Continue editing JSX with only the previously loaded TypeScript rules.

// Prefer:
Read frontend and React rules before editing the component.
Add Next.js rules only if the change crosses a Next.js framework boundary.
```

Inspecting a React caller for context does not itself make that component an implementation target.
Reselect rules when affected responsibilities or technologies expand, not merely when reading context.

## Distinguish Missing Coverage From Missing Required Guidance

```text
Situation: The task changes Redis-backed server logic.
No maintained EV Redis companion exists.

// Avoid:
Block all implementation because a Redis-specific skill is unavailable.
Invent Redis-specific requirements and present them as EV standards.

// Prefer:
Apply the available general/backend rules.
Use project guidance and verified technical documentation as needed.
Report that no maintained Redis-specific EV companion covers the change.
```

```text
Situation: An applicable skill links a required reference that cannot be read.

// Avoid:
Guess its contents from the filename or continue using an incomplete summary.

// Prefer:
Report the exact missing path.
Resolve the missing required guidance before editing affected code.
Continue independent inspection that does not depend on the missing rules.
```

Missing technology coverage does not excuse unresolved correctness, security, or data-integrity questions.
An unavailable required rule source is different from a technology with no maintained companion.

## Complete The Requested Fix Without Unrelated Cleanup

```text
Task: Rename an exported function to comply with the naming rule.

// Avoid:
Rename the declaration and leave imports, callers, and tests broken.

// Also avoid:
Rename unrelated functions throughout the repository.

// Prefer:
Update the declaration, affected imports/callers, and relevant tests.
Preserve behavior.
Report unrelated naming findings separately.
```

```text
Task: "Change only src/orders/calculate-total.ts."
The correction also requires changing a caller outside that file.

// Avoid:
Silently edit the caller despite the explicit file restriction.

// Prefer:
Explain why the caller must change.
Ask whether the scope may include that file before editing it.
```

Necessary caller updates normally belong to a complete fix but do not override an explicit restriction.
Preserve existing user changes and avoid repository-wide cleanup unrelated to the requested correction.

## Report What Verification Established

```text
Situation: Formatting and scoped tests pass, but typecheck cannot run.

// Avoid:
"All checks passed. The change is fully compliant."

// Prefer:
Formatting: PASS — documented formatting check completed.
Scoped tests: PASS — affected test suite completed.
Typecheck: UNVERIFIED — required generated types are unavailable.
Build: NOT RUN — prerequisite environment configuration is unavailable.
```

```text
Situation: The coverage validator accepts the review results.

// Avoid:
"The validator proves that the code is correct and every rule was satisfied."

// Prefer:
"The validator confirmed completeness and referential consistency
for the submitted review plan/results.
Behavioral correctness still depends on the recorded review evidence."
```

Select checks appropriate to the changed behavior from documented scripts/CI. Do not automatically run
every command, infer coverage from a command name, or confuse a failed check with an unavailable check.
Apply the core's read-only verification policy: inspect artifact/cache writes and service effects,
use external output locations or isolation only when permitted, and obey stricter plan-mode restrictions.
These narrative verification labels do not replace the review coverage contract: map missing evidence
to `UNVERIFIED` for an assigned check and explain its cause. Never claim a check passed if it did not run.

## Match Reporting To The Requested Workflow

| Request | Expected behavior |
| --- | --- |
| Review finds eight distinct issues | Display all eight in chat, with severity, location, rule, evidence, impact, and minimal fix. Group by severity; never stop at five. |
| Fix those eight issues | Display all eight with fixed/remaining status and verification evidence; do not silently drop resolved findings. |
| Generate code with standards active | Apply rules and run completion checks internally. Do not append a separate standards report or summary; surface unresolved blockers and material gaps. |
| Generate code and explicitly report the review | Honor the requested exhaustive chat report. |

## Reuse Generation Evidence Without Weakening Review

| Situation | Required behavior |
| --- | --- |
| Implement multiple files with the same loaded rules | Reuse full guidance; review the coherent unit when ready, not after each edit. |
| Fix one unit after checks passed | Recheck that change and affected dependencies/checks; preserve unrelated valid evidence. |
| Change a shared API/schema after reviewing callers | Invalidate dependent caller/integration evidence, including unchanged files. |
| Complete a multi-unit task | Reconcile all changes against current unit evidence and verify integration; no automatic full restart or formal coverage JSON. |
| Compact the context | Retain recoverable evidence and source identities; verify current changes and reload missing full rules before resuming. A summary never replaces either. |
| Request an explicit review after generation | Run the complete formal workflow over the requested baseline/scope; checkpoints alone do not satisfy it. |

The selected review core's `references/generation-review.md` owns this workflow. Its
`references/generation-verification.md` defines behavioral regressions and paired cost/quality trials;
static metadata checks do not establish quality parity or speed gains.

## Separate Application Work, Contributions, And Activation

```text
Task: Fix an application bug.
The standards checkout has uncommitted rule changes.

// Avoid:
Apply the clean-main contribution prerequisite to unrelated application edits.

// Prefer:
Read the applicable local rules.
Report the standards revision and dirty state.
Resolve relevant rule conflicts, then work within the application scope.
```

```text
Task: Add an example to an EV standard.

// Avoid:
Treat the request as permission to commit, push, merge, or activate the rule.

// Prefer:
Follow the contribution workflow and its prerequisites.
Edit and validate the requested rule.
Report the contribution location and publication/activation state.
Publish only when authorized.
```

```text
Situation: The user explicitly authorizes editing the original checkout directly.

// Avoid:
Discard existing changes to obtain a clean checkout.
Assume the exception also permits publication.

// Prefer:
Apply the authorized edit directly.
Preserve existing work and run the applicable checks.
Keep the exception limited to the current task.
```

Editing source files and refreshing already-loaded instructions are different operations. Report the
actual state: when links already point to the edited checkout, files may be visible there while the
running agent still retains previously loaded instructions. Do not claim global activation merely
because validation passed. Follow the update workflow when required and report any necessary restart.
The direct-edit exception does not bypass the global update helper's own safety checks.
