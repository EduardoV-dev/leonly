# Update Global Standards

Resolve `~/.agents/skills/ev-coding-standards` to its real directory, then run:

```bash
python3 <resolved-skill-directory>/assets/manage.py update
```

The helper verifies the source Git root and `EduardoV-dev/my-skills` origin, requires a clean `main`,
and runs `git pull --ff-only origin main`. It validates maintained skill metadata/local links and
reconciles owned global skill/command links and the managed global instruction block.
It never resets, stashes, switches branches, force-pushes, or overwrites unrelated installations.

If the checkout is dirty, on another branch, diverged, or ahead with unpublished commits, stop and report the cause; preserve local
work. A failed validation after pulling leaves that revision checked out: report failure, do not claim
activation succeeded or automatically reset it. Fix through a rule contribution and retry update.

Report old/new revision, changed links, and verification status. An update does not rewrite a project's
local skill overrides. Quit and restart OpenCode after installation/update so discovery and already-loaded
skill contents refresh; a running session may retain earlier instructions.
