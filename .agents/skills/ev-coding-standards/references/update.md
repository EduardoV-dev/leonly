# Update Global Standards

This workflow runs only for an explicit update request, never as a prerequisite for implementation,
check/fix, or project wiring. Resolve the selected installed `ev-coding-standards` directory through
the harness or installed skill locations; do not search the filesystem for an upstream checkout.

If that installed directory resolves to `skills/ev-coding-standards` in a backing Git checkout of
`EduardoV-dev/my-skills`, run:

```bash
python3 <resolved-skill-directory>/assets/manage.py update
```

For an installed copy without that backing checkout, report that the repository helper cannot update
it and request reinstallation through its original installer/scope. Do not guess the installer,
clone or locate a separate checkout, or run the repository helper against the target application.

The repository helper verifies the source Git root and `EduardoV-dev/my-skills` origin, requires a clean `main`,
and runs `git pull --ff-only origin main`. It validates maintained skill metadata/local links and
reconciles owned global skill/command links and the managed global instruction block.
It never resets, stashes, switches branches, force-pushes, or overwrites unrelated installations.

If the checkout is dirty, on another branch, diverged, or ahead with unpublished commits, stop and report the cause; preserve local
work. A failed validation after pulling leaves that revision checked out: report failure, do not claim
activation succeeded or automatically reset it. Resolve the reported issue manually and retry update.

Report old/new revision, changed links, and verification status. An update does not rewrite a project's
local skill overrides. Quit and restart OpenCode after installation/update so discovery and already-loaded
skill contents refresh; a running session may retain earlier instructions.
