---
name: ev-project-setup
description: "Trigger: set up skills, wire skills into a project, refresh project skills. Maintain session/task skill activation in project AGENTS.md."
license: Apache-2.0
metadata:
  author: "eduardovdev"
  version: "1.0"
---

# EV Project Setup

## Activation Contract

Use when asked to wire installed skills into a project or refresh its skill-loading instructions.

## Hard Rules

- Read [setup](references/setup.md) before acting. Use the explicit target directory; never substitute
  an ancestor repository or change global configuration as a side effect.
- Preserve project instructions and user changes. Own only the marked EV project-skills block;
  append only missing `__pycache__/` and `*.py[cod]` entries to the project `.gitignore`.
  Refuse malformed markers and symlinked setup files rather than overwriting them.
- Resolve required skills before wiring. Do not install missing skills, copy rule bodies into
  instructions, or assume that discovery means full rules were loaded.
- Keep setup, implementation, checks, and reviews in the current agent thread. Respect plan mode.

## Decision Gates

| Situation | Action |
| --- | --- |
| Required core skills unavailable | Report exact missing names and installation step; stop wiring. |
| Applicable technology companion unavailable | Report coverage gap; do not claim that coverage. |
| Conflicting project policy or malformed managed block | Preserve files; resolve the conflict before writing. |
| Existing well-formed block | Refresh the managed block from the current template, preserve content outside its markers, and ensure both ignore entries exist. Repeated setup is idempotent. |

## Execution Steps

1. Inspect target guidance, workspace boundaries, manifests, and available skill metadata. Resolve
   `ev-coding-standards` and `ev-code-rules`, preferring project-local copies; report shadowing.
2. Read those core skills and the full setup reference. Identify relevant installed companions
   without restricting future task selection to today's dependencies or a fixed skill list.
3. Run this skill's `assets/setup_project.py <project-root>` with Python 3 to maintain instructions
   and both Python ignore entries; in plan mode inspect only.
4. Run the helper again with `--check`, inspect the diff, and follow the fresh-session checks in the
   setup reference. Report structural verification separately from agent behavior.

## Output Contract

Report target/instruction path, changed or unchanged state, installed skill paths/available metadata,
missing coverage, checks, and fresh-session verification gaps. Require an agent restart to reload
instructions; for OpenCode, quit and restart it.

## References

- [Setup workflow and behavioral checks](references/setup.md)
- [Managed project instructions](assets/project-instructions.md)
- [Project wiring helper](assets/setup_project.py)
