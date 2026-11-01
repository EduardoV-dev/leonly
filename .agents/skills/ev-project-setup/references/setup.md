# Wire Skills Into A Project

## Resolve Before Writing

1. Use the requested existing project root. If none is supplied, use the current workspace root;
   ask only when the target is ambiguous. Read its root and applicable nested instructions. Inspect
   existing global loaders for conflicting policy, but do not modify them.
2. Discover skill metadata from the harness or known project/user skill directories. Resolve
   `ev-coding-standards` and `ev-code-review` to exact readable paths. Read both skill bodies and
   follow their guidance when implementing code; setup alone does not require an application review.
   Report each source revision and dirty state when backed by Git; otherwise report provenance as
   unavailable. Do not use the target project's revision as an installed skill's revision.
3. Inspect package/workspace configuration and representative scoped code to identify installed
   technology companions and implementation skills. Report relevant missing coverage. A missing
   core skill or required reference blocks wiring; missing optional technology coverage does not.
   Inspect the project's formatter/linter, installed versions, effective configuration, and scripts.
   Read the selected review core's `references/logical-code-grouping.md`; identify compatible automated
   spacing checks and semantic-only coverage. Propose minimal configuration changes where useful;
   do not silently install tooling or modify formatter/linter configuration during instruction wiring.
4. If installation is needed, report the missing names and a targeted Skills CLI command for the
   user's agent. Obtain installation authorization before running it. For example, from the target
   project, `npx skills add EduardoV-dev/my-skills --skill ev-project-setup --skill ev-coding-standards
   --skill ev-code-review`. Select relevant companions as needed. Do not replace an existing same-name
   skill to obtain a clean setup.

The installed setup skill's directory is the base for commands below. Do not assume sibling skills
exist: installers may expose only selected skills or use different directories for each agent.

## Write And Verify

Run `python3 <setup-skill>/assets/setup_project.py "<project-root>"`, then repeat with `--check`.
The helper writes only `<project-root>/AGENTS.md`; it does not install skills or verify their runtime
availability. It preserves content outside `ev-project-skills` markers and refuses symlinked files,
unpaired/duplicate/reversed markers, and missing target directories. `--check` returns 0 for current
wiring and 1 for missing/outdated wiring or errors, without writing.

Inspect the resulting diff and confirm the block matches the bundled template. Existing unrelated
instructions must remain intact. Flag conflicting older loaders for resolution; do not remove them
automatically. No absolute installation path, rule body, or frozen skill inventory belongs in the block.
It must select future skills by their activation descriptions, not today's dependency list.

For monorepos, wire the explicitly selected workspace root. Inspect nested guidance for conflicts;
do not rewrite every package. Report any nested policy that prevents the intended activation.
Agents must support reading `AGENTS.md` for this adapter to apply. Other instruction formats need
their own adapter; do not claim that creating this file configures every agent.

## Fresh-Session Behavioral Checks

Restart the agent after wiring (quit and restart OpenCode). Use disposable project copies for these
checks; do not change real application behavior just to test activation.

| Scenario | Required evidence |
| --- | --- |
| Request a small code change without mentioning skills | Full standards and applicable review rules load before edits; scoped checks/review follow. |
| Request a non-coding task matching an installed skill | Matching skill loads before work; unrelated coding rule bodies stay unloaded. |
| Add a skill with a new task trigger, restart, and request that task | New skill activates without rewriting the managed block. |
| Remove required core guidance or a required reference | Agent reports the exact gap before affected code edits. |
| Work crosses into a new technology/domain | Agent reselects and loads newly applicable rules before affected edits. |

Separate helper/metadata test results from these agent traces. If no fresh session was exercised,
report behavior as unverified. Instructions establish obligations; they are not a runtime tool gate.
