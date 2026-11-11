## Skill activation

At the start of every session, inspect the harness's available skill names and descriptions.
If unavailable or incomplete, inspect `SKILL.md` metadata in the project's `.agents/skills/`,
`.opencode/skills/`, and `.claude/skills/`, then the equivalent user locations, including
`~/.agents/skills/` and `~/.config/opencode/skills/`. Use any project registry only after checking
that its entries still resolve. Prefer project-local copies of the same skill and report shadowing
or incompatible sources; do not silently mix versions.

Resolve references relative to each selected installed skill. Normal skill use must not search for,
clone, or require the upstream repository or its Git state. Use installed paths and available skill
metadata for provenance; unavailable source revisions do not block work.

Before each task, match its intent, target files, and actual technology usage to available skill
activation descriptions. Load the complete matching `SKILL.md` files and their required references
before acting; reuse unchanged full guidance already available in the active context rather than
reloading it per file or edit. Reload missing/changed guidance and load newly applicable rules.
Apply this to implementation, debugging, review, documentation, setup, and other
workflows, including newly installed skills. Reevaluate when task scope changes. Discovery alone
does not load rules; do not load unrelated skill bodies or limit selection to a fixed skill list.

Apply compatible instructions from all applicable skills together without requiring third-party skills.
Follow the instruction hierarchy and applicable project guidance; do not treat skill origin as priority.
For irreconcilable instructions with no governing priority, identify the sources and affected action,
surface the conflict, and obtain a decision before that action. Do not silently weaken EV rules.

Before generating or changing code, load `ev-coding-standards`. Follow its pre-coding workflow to
read complete general, applicable frontend/backend, technology, and implementation rules. Reuse
`ev-code-rules` rules while generating code; do not defer standards until an explicit review.
Apply standards as coding guidance and run relevant project checks, including affected integration.
Do not automatically review work units, assess every rule after implementation, keep review-evidence
ledgers, or reconcile review coverage at handoff. Reuse check results only while they cover the completed
state. Before compaction retain task/check context; afterward verify current changes and reload missing
full rules. Record installed rule paths, available skill metadata, and performed checks internally;
do not emit a separate review report or standards summary. Surface unresolved blockers,
required decisions, and material verification gaps. For explicit standards checks/fixes, report every finding with severity, location, rule, evidence,
impact, minimal fix, and fixed/remaining status when applicable. Use other skills for functional reviews.

Use the skill tool when available; otherwise read the resolved local `SKILL.md` directly and follow
its references. If a required core skill or required reference is missing, name the exact gap and
resolve it before affected edits. A technology with no maintained companion is a coverage gap:
apply available core rules without inventing technology rules or claiming full coverage.

Preserve the instruction hierarchy, applicable nested project guidance, skill exceptions, and plan
mode. Surface unresolved policy conflicts before affected changes. Keep maintained EV workflows
in the current agent thread; never spawn subagents or parallel reviewers. A skill match does not
authorize installation, unrelated edits, commits, publication, or destructive operations.
