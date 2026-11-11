## EV coding standards

Before implementing or changing code, load `ev-coding-standards` and its full applicable rules.
If absent from the skill tool, resolve it from installed project/user skill directories and read its
`SKILL.md`. Follow references relative to the selected installed skill. Do not search for or require
the upstream repository or its Git state during normal coding, check/fix, or project wiring.
Reselect rules when scope expands. Do not edit affected code without required guidance.
Reuse unchanged full guidance already in the active context; reload missing/changed rules instead of
reloading per file/edit. Apply standards as coding guidance and run relevant project checks. Do not
automatically review work units, track per-rule review evidence, or reconcile review coverage at handoff.
Preserve task/check context before compaction; verify current changes and reload missing full guidance
afterward. Run a complete review only when explicitly requested; keep relevant implementation checks.
Keep all implementation, checks, and reviews in the current agent thread. Never spawn subagents or
parallel reviewers; perform applicable work sequentially.
Combine compatible applicable skill instructions; follow instruction hierarchy and project guidance.
Do not require third-party skills or prioritize by origin. Surface unresolved conflicts and obtain a
decision before affected work; do not silently weaken existing rules.
Use matching skills for requested standards checks, cleanup, simplification, or standards updates.
Record installed rule paths, available skill metadata, and checks internally during generation without a separate
standards report or summary; surface blockers and material verification gaps. Explicit standards check/fix
requests require every finding in chat with severity, location, evidence, impact, and minimal fix,
plus fixed/remaining status when applicable. Check the entire requested scope. Never truncate to five or a top-N subset. Respect plan mode.
Use other skills for functional code reviews.
