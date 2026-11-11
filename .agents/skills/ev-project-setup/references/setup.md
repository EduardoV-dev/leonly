# Wire Skills Into A Project

## Resolve Before Writing

1. Use the requested existing project root. If none is supplied, use the current workspace root;
   ask only when the target is ambiguous. Read its root and applicable nested instructions. Inspect
   existing global loaders for conflicting policy, but do not modify them.
2. Discover skill metadata from the harness or known project/user skill directories. Resolve
   `ev-coding-standards` and `ev-code-rules` to exact readable paths. Read both skill bodies and
   follow their guidance when implementing code; setup alone does not require an application review.
   Use each installed skill as the base for its references and report paths/available metadata.
   Do not search for or require an upstream checkout or its Git state. Unavailable source revisions
   do not block wiring; the target project's revision is not an installed skill's revision.
3. Inspect package/workspace configuration and representative scoped code to identify installed
   technology companions and implementation skills. Report relevant missing coverage. A missing
   core skill or required reference blocks wiring; missing optional technology coverage does not.
   Inspect the project's formatter/linter, installed versions, effective configuration, and scripts.
   Read the selected coding rules skill's `references/logical-code-grouping.md`; identify compatible automated
   spacing checks and semantic-only coverage. Propose minimal configuration changes where useful;
   do not silently install tooling or modify formatter/linter configuration during instruction wiring.
4. If installation is needed, report the missing names and a targeted Skills CLI command for the
   user's agent. Obtain installation authorization before running it. For example, from the target
   project, `npx skills add EduardoV-dev/my-skills --skill ev-project-setup --skill ev-coding-standards
   --skill ev-code-rules`. Select relevant companions as needed. Do not replace an existing same-name
   skill to obtain a clean setup.

The installed setup skill's directory is the base for commands below. Do not assume sibling skills
exist: installers may expose only selected skills or use different directories for each agent.

## Write And Verify

Run `python3 <setup-skill>/assets/setup_project.py "<project-root>"`, then repeat with `--check`.
The helper maintains `<project-root>/AGENTS.md` and ensures `<project-root>/.gitignore` contains
`__pycache__/` and `*.py[cod]`, since Python skill tooling can generate these files. It creates the
ignore file if missing, appends only missing exact entries, and preserves existing content. It does
not delete generated caches or untrack already tracked files; ignores only affect untracked files.
It does not install skills or verify their runtime availability.
It preserves content outside `ev-project-skills` markers and refuses symlinked setup files,
unpaired/duplicate/reversed markers, and missing target directories. `--check` returns 0 for current
wiring and ignore entries, and 1 for missing/outdated setup or errors, without writing either file.

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
| Use installed copies without an upstream checkout | Rules and bundled references load from installed paths; no upstream repository search, clone, or Git provenance commands occur. |
| Request a small code change without mentioning skills | Full applicable rules load as coding guidance before edits; relevant project checks run without automatic review. |
| Request a non-coding task matching an installed skill | Matching skill loads before work; unrelated coding rule bodies stay unloaded. |
| Add a skill with a new task trigger, restart, and request that task | New skill activates without rewriting the managed block. |
| Remove required core guidance or a required reference | Agent reports the exact gap before affected code edits. |
| Work crosses into a new technology/domain | Agent reselects and loads newly applicable rules before affected edits. |
| Explicit standards check discovers more than five distinct findings | Every finding appears in chat with severity, location, rule, evidence, impact, and minimal fix. |
| Generate code without requesting a review | No unit-review passes, per-rule evidence ledgers, or final coverage reconciliation; check results and material gaps are reported without a compliance claim. |
| Edit multiple files under unchanged guidance | Loaded full coding guidance is reused; no automatic review workflow starts. |
| Change a shared contract or resume after compaction | Affected checks are reconsidered; missing full rules reload and retained results are verified against current state before reuse. |

Separate helper/metadata test results from these agent traces. If no fresh session was exercised,
report behavior as unverified. Instructions establish obligations; they are not a runtime tool gate.
Use the selected coding rules skill's `references/generation-verification.md` for the complete regression
matrix and paired cost/quality comparison; do not infer savings from fewer instructions alone.
