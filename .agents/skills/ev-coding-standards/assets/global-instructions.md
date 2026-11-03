## EV coding standards

Before implementing or changing code, load `ev-coding-standards` and its full applicable rules.
If it is absent from the skill tool, read `{{skill_path}}/SKILL.md` directly and follow its local
references. Reselect rules when scope expands. Do not edit affected code without required guidance.
Reuse unchanged full guidance already in the active context; reload missing/changed rules instead of
reloading per file/edit. Use the selected core's incremental generation workflow: review coherent units,
retain compact evidence, recheck invalidated code/dependencies, and reconcile the final diff/integration.
Preserve recoverable continuation evidence before compaction; verify it and reload missing full guidance
afterward. Generation requires no formal coverage JSON or validator run; never skip substantive checks.
Keep all implementation, checks, and reviews in the current agent thread. Never spawn subagents or
parallel reviewers; perform applicable work sequentially.
Use the same skill for `ev-check`, `ev-fix`, `ev-update`, and `ev-add-rule`; check is read-only.
Record source revision, selected rule paths, and checks internally during generation without a separate
standards report or summary; surface blockers and material verification gaps. Explicit review/check/fix
requests require every finding in chat with severity, location, evidence, impact, and minimal fix,
plus fixed/remaining status when applicable. Use the full formal workflow over the entire requested
scope; generation checkpoints do not replace it. Never truncate to five or a top-N subset. Respect plan mode.
