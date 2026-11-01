## EV coding standards

Before implementing or changing code, load `ev-coding-standards` and its full applicable rules.
If it is absent from the skill tool, read `{{skill_path}}/SKILL.md` directly and follow its local
references. Reselect rules when scope expands. Do not edit affected code without required guidance.
Keep all implementation, checks, and reviews in the current agent thread. Never spawn subagents or
parallel reviewers; perform applicable work sequentially.
Use the same skill for `ev-check`, `ev-fix`, `ev-update`, and `ev-add-rule`; check is read-only.
Record source revision, selected rule paths, and checks internally during generation without a separate
standards report or summary; surface blockers and material verification gaps. Explicit review/check/fix
requests require every finding in chat with severity, location, evidence, impact, and minimal fix,
plus fixed/remaining status when applicable; never truncate to five or a top-N subset. Respect plan mode.
