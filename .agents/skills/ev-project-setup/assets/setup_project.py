"""Maintain a portable skill-activation block in a project's AGENTS.md."""

import argparse
import sys
from pathlib import Path


START = "<!-- ev-project-skills:start -->"
END = "<!-- ev-project-skills:end -->"


def build_instructions(existing):
    if existing.count(START) != existing.count(END) or existing.count(START) > 1:
        raise ValueError("Malformed EV project markers; preserve and repair AGENTS.md")
    template = Path(__file__).with_name("project-instructions.md").read_text(encoding="utf-8")
    block = f"{START}\n{template.strip()}\n{END}"
    if START not in existing:
        separator = "\n\n" if existing and not existing.endswith("\n\n") else ""
        return existing + separator + block + "\n"
    start = existing.index(START)
    end = existing.index(END)
    if end < start:
        raise ValueError("Reversed EV project markers; preserve and repair AGENTS.md")
    return existing[:start] + block + existing[end + len(END):]


def setup_project(project, *, check=False):
    project = Path(project).resolve()
    if not project.is_dir():
        raise ValueError(f"Expected an existing project directory: {project}")
    instructions = project / "AGENTS.md"
    if instructions.is_symlink():
        raise ValueError(f"Refusing symlinked instructions: {instructions}")
    existing = instructions.read_bytes().decode("utf-8") if instructions.exists() else ""
    updated = build_instructions(existing)
    if existing == updated:
        print(f"Current skill activation block: {instructions}")
        return True
    if check:
        print(f"Missing or outdated skill activation block: {instructions}")
        return False
    instructions.write_bytes(updated.encode("utf-8"))
    print(f"Updated skill activation block: {instructions}")
    return True


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("project", type=Path, help="Existing target project root")
    parser.add_argument("--check", action="store_true", help="Check wiring without writing")
    arguments = parser.parse_args()
    try:
        return 0 if setup_project(arguments.project, check=arguments.check) else 1
    except (OSError, ValueError) as error:
        print(f"EV project setup: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
