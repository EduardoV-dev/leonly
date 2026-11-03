## Skill activation

At the start of every session, inspect the harness's available skill names and descriptions.
If unavailable or incomplete, inspect `SKILL.md` metadata in the project's `.agents/skills/`,
`.opencode/skills/`, and `.claude/skills/`, then the equivalent user locations, including
`~/.agents/skills/` and `~/.config/opencode/skills/`. Use any project registry only after checking
that its entries still resolve. Prefer project-local copies of the same skill and report shadowing
or incompatible sources; do not silently mix versions.

Before each task, match its intent, target files, and actual technology usage to available skill
activation descriptions. Load the complete matching `SKILL.md` files and their required references
before acting; reuse unchanged full guidance already available in the active context rather than
reloading it per file or edit. Reload missing/changed guidance and load newly applicable rules.
Apply this to implementation, debugging, review, documentation, setup, and other
workflows, including newly installed skills. Reevaluate when task scope changes. Discovery alone
does not load rules; do not load unrelated skill bodies or limit selection to a fixed skill list.

Before generating or changing code, load `ev-coding-standards`. Follow its pre-coding workflow to
read complete general, applicable frontend/backend, technology, and implementation rules. Reuse
`ev-code-review` rules while generating code; do not defer standards until an explicit review.
Follow the selected review core's incremental generation workflow: review coherent work units, retain
compact evidence, invalidate it when relevant code/rules/dependencies/configuration change, and finish
with final-diff reconciliation and integration checks. Do not launch a formal review per edit or repeat
still-valid checks at completion. Before compaction retain recoverable continuation evidence; afterward
verify sources/current changes and reload missing full rules. Generation requires no formal coverage
JSON or validator run. Record selected rule paths, source revision/dirty state, and results internally;
do not emit a separate review report or standards summary. Surface unresolved blockers,
required decisions, and material verification gaps. For explicit review/check/fix requests, display
every finding in chat with severity, location, rule, evidence, impact, minimal fix, and fixed/remaining
status when applicable. Use the full formal workflow over the entire requested scope; generation
checkpoints do not replace it. Never truncate findings to five or another top-N subset.

Use the skill tool when available; otherwise read the resolved local `SKILL.md` directly and follow
its references. If a required core skill or required reference is missing, name the exact gap and
resolve it before affected edits. A technology with no maintained companion is a coverage gap:
apply available core rules without inventing technology rules or claiming full coverage.

Preserve the instruction hierarchy, applicable nested project guidance, skill exceptions, and plan
mode. Surface unresolved policy conflicts before affected changes. Keep maintained EV workflows
in the current agent thread; never spawn subagents or parallel reviewers. A skill match does not
authorize installation, unrelated edits, commits, publication, or destructive operations.
