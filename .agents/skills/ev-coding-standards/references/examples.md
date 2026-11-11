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


Select checks appropriate to the changed behavior from documented scripts/CI. Do not automatically run
every command, infer coverage from a command name, or confuse a failed check with an unavailable check.
Apply the core's read-only verification policy: inspect artifact/cache writes and service effects,
use external output locations or isolation only when permitted, and obey stricter plan-mode restrictions.
Mark missing evidence as `UNVERIFIED` and explain its cause. Never claim a check passed if it did not run.

## Match Reporting To The Requested Workflow

| Request | Expected behavior |
| --- | --- |
| Review finds eight distinct issues | Display all eight in chat, with severity, location, rule, evidence, impact, and minimal fix. Group by severity; never stop at five. |
| Fix those eight issues | Display all eight with fixed/remaining status and verification evidence; do not silently drop resolved findings. |
| Generate code with standards active | Apply rules and run completion checks internally. Do not append a separate standards report or summary; surface unresolved blockers and material gaps. |
| Generate code and explicitly report the review | Honor the requested exhaustive chat report. |

## Separate Implementation Checks From Requested Review

| Situation | Required behavior |
| --- | --- |
| Implement multiple files with the same loaded rules | Reuse full coding guidance and run relevant project checks; no automatic unit review or per-rule assessment. |
| Fix behavior after checks passed | Rerun affected checks; reuse unrelated results only while still valid. |
| User requests concrete edits after their own review of a 100-file implementation | Continue implementation and check changed behavior and dependent consumers; do not review the delta or restart a review of all 100 files. The word "fix" alone does not select formal review. |
| User requests "review these corrections" | Use an appropriate review skill for the follow-up delta and relevant dependencies, not the entire original dirty diff. |
| Change a shared API/schema after checks passed | Check affected consumers/integration, including unchanged files; stale command results are not reused. |
| Complete a multi-unit task | Verify affected integration and report relevant checks/gaps; no review-evidence ledger or final review-coverage reconciliation. |
| Compact the context | Retain task/check context and source identities; verify current changes and reload missing full rules before resuming. A summary does not prove a check passed. |
| Request an explicit review after generation | Use an appropriate functional review skill over the requested baseline/scope. |

The selected coding rules skill's `references/generation-review.md` owns this workflow. Its
`references/generation-verification.md` defines behavioral regressions and paired cost/quality trials;
static metadata checks do not establish agent behavior, quality parity, or speed gains.

## Use Installed Skills Without An Upstream Checkout

```text
Task: Fix an application bug.
The standards were installed as copies without a backing Git checkout.

// Avoid:
Search for a local my-skills checkout or require its Git revision before coding.

// Prefer:
Read the applicable local rules.
Resolve references relative to each selected installed skill and record available metadata.
Treat unavailable source provenance as non-blocking.
Resolve relevant rule conflicts, then work within the application scope.
```

```text
Task: Explicitly update installed standards.

// Avoid:
Search the filesystem for a separate source checkout or clone one automatically.

// Prefer:
Use the repository update helper only if the selected installed skill resolves into its backing checkout.
For standalone copies, report that limitation and request reinstallation via the original installer/scope.
Preserve local work and report actual update/activation results.
```

```text
Situation: The user manually edits rules in their source checkout.

// Avoid:
Create contribution branches/worktrees or publish changes without being asked.

// Prefer:
Follow the repository's instructions, preserve existing work, and run applicable checks.
Treat manual rule maintenance separately from installed skill use and explicit updates.
```

Editing source files and refreshing already-loaded instructions are different operations. Report the
actual state: when links already point to the edited checkout, files may be visible there while the
running agent still retains previously loaded instructions. Do not claim global activation merely
because validation passed. Follow the update workflow when required and report any necessary restart.
The direct-edit exception does not bypass the global update helper's own safety checks.
