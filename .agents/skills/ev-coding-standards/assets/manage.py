"""Install and synchronize EV standards without overwriting unrelated work."""

import argparse
import re
import subprocess
import sys
from pathlib import Path


START = "<!-- ev-coding-standards:start -->"
END = "<!-- ev-coding-standards:end -->"
ORIGINS = {
    "git@github.com:EduardoV-dev/my-skills.git",
    "ssh://git@github.com/EduardoV-dev/my-skills.git",
    "https://github.com/EduardoV-dev/my-skills.git",
    "https://github.com/EduardoV-dev/my-skills",
}


def git(repo, *arguments):
    result = subprocess.run(
        ["git", "-C", str(repo), *arguments], capture_output=True, text=True
    )
    if result.returncode:
        raise RuntimeError(result.stderr.strip() or result.stdout.strip())
    return result.stdout.strip()


def verify_source(repo):
    if Path(git(repo, "rev-parse", "--show-toplevel")).resolve() != repo:
        raise RuntimeError(f"Not a Git root: {repo}")
    if git(repo, "remote", "get-url", "origin") not in ORIGINS:
        raise RuntimeError("Expected origin EduardoV-dev/my-skills; no changes made")


def validate(repo):
    skills = sorted((repo / "skills").glob("*/SKILL.md"))
    if not skills:
        raise RuntimeError("No maintained skills found")
    for path in skills:
        text = path.read_text()
        frontmatter = re.match(r"\A---\n(.*?)\n---(?:\n|$)", text, re.S)
        name = path.parent.name
        if not frontmatter or not re.fullmatch(r"ev-[a-z0-9]+(?:-[a-z0-9]+)*", name):
            raise RuntimeError(f"Invalid frontmatter/name: {path}")
        header = frontmatter.group(1)
        if not re.search(rf"^name: {re.escape(name)}$", header, re.M):
            raise RuntimeError(f"Directory/name mismatch: {path}")
        description = re.search(r'^description: "([^"\n]+)"$', header, re.M)
        if not description or len(description.group(1)) > 250:
            raise RuntimeError(f"Expected quoted one-line description <=250 characters: {path}")
        for pattern in (r"^license: .+$", r"^metadata:$", r'^  author: "[^"]+"$',
                        r'^  version: "[^"]+"$'):
            if not re.search(pattern, header, re.M):
                raise RuntimeError(f"Missing metadata ({pattern}): {path}")
        for document in path.parent.rglob("*.md"):
            for link in re.findall(r"\[[^\]]*\]\(([^)]+)\)", document.read_text()):
                if "://" in link or link.startswith("#"):
                    continue
                if not (document.parent / link.split("#", 1)[0]).exists():
                    raise RuntimeError(f"Broken local link in {document}: {link}")
    return [path.parent for path in skills]


def build_instruction_text(existing, skill):
    if existing.count(START) != existing.count(END) or existing.count(START) > 1:
        raise RuntimeError("Malformed EV instruction markers; preserve and repair AGENTS.md")
    template = (skill / "assets/global-instructions.md").read_text().strip()
    block = f"{START}\n{template}\n{END}"
    if START not in existing:
        separator = "\n\n" if existing and not existing.endswith("\n\n") else ""
        return existing + separator + block + "\n"
    start = existing.index(START)
    end = existing.index(END)
    if end < start:
        raise RuntimeError("Reversed EV instruction markers; preserve and repair AGENTS.md")
    return existing[:start] + block + existing[end + len(END):]


def check_link(link, target):
    if link.is_symlink() and link.resolve() == target:
        return
    if link.exists() or link.is_symlink():
        raise RuntimeError(f"Installation collision: {link}; nothing overwritten")


def install(repo, home):
    skills = validate(repo)
    skill = repo / "skills/ev-coding-standards"
    config = home / ".config/opencode"
    destinations = [(home / ".agents/skills" / source.name, source) for source in skills]
    command_source = skill / "assets/commands"

    # Preflight every collision before changing any installation files.
    for link, target in destinations:
        check_link(link, target)
    for source in skills:
        for directory in (config / "skills", config / "skill", home / ".claude/skills"):
            check_link(directory / source.name, source)
    instructions = config / "AGENTS.md"
    existing = instructions.read_text() if instructions.exists() else ""
    updated = build_instruction_text(existing, skill)

    for link, target in destinations:
        link.parent.mkdir(parents=True, exist_ok=True)
        if not link.is_symlink():
            link.symlink_to(target, target_is_directory=target.is_dir())
            print(f"Linked {link} -> {target}")
    active = home / ".agents/skills"
    names = {source.name for source in skills}
    for link in active.glob("ev-*"):
        target = link.resolve()
        if link.is_symlink() and target.parent == repo / "skills" and link.name not in names:
            link.unlink()
            print(f"Removed retired owned link: {link}")
    for directory in (config / "commands", config / "command"):
        for link in directory.glob("ev-*.md"):
            target = link.resolve()
            is_retired_owned_command = (
                link.is_symlink() and target.parent == command_source
                and target.name == link.name
            )
            if is_retired_owned_command:
                link.unlink()
                print(f"Removed retired owned command: {link}")

    if updated != existing:
        config.mkdir(parents=True, exist_ok=True)
        instructions.write_text(updated)
        print(f"Updated managed block: {instructions}")


def sync_main(repo):
    if git(repo, "branch", "--show-current") != "main":
        raise RuntimeError("Expected main; branch was not changed")
    if git(repo, "status", "--porcelain", "--untracked-files=all"):
        raise RuntimeError("Source checkout is dirty; resolve local work before synchronization")
    before = git(repo, "rev-parse", "HEAD")
    git(repo, "pull", "--ff-only", "origin", "main")
    after = git(repo, "rev-parse", "HEAD")
    if after != git(repo, "rev-parse", "FETCH_HEAD"):
        raise RuntimeError("Main has unpublished commits; preserve and contribute them before synchronization")
    print(f"Source revision: {before} -> {after}")
    return after


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("action", choices=("setup", "validate", "update"))
    arguments = parser.parse_args()
    repo = Path(__file__).resolve().parents[3]
    try:
        verify_source(repo)
        if arguments.action == "update":
            sync_main(repo)
        if arguments.action == "validate":
            print(f"Validated {len(validate(repo))} maintained skills")
            return
        if git(repo, "branch", "--show-current") != "main":
            raise RuntimeError("Global installation requires the active checkout on main")
        install(repo, Path.home())
        revision = git(repo, "rev-parse", "HEAD")
        state = " (dirty)" if git(repo, "status", "--porcelain") else ""
        print(f"Installed source: {revision}{state}")
        print("Quit and restart OpenCode to refresh skills.")
    except (RuntimeError, OSError) as error:
        print(f"EV standards: {error}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
