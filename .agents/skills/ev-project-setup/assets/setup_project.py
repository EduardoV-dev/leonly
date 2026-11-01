"""Maintain project skill instructions and Python cache ignores."""

import argparse
import sys
from pathlib import Path


START = "<!-- ev-project-skills:start -->"
END = "<!-- ev-project-skills:end -->"
PYTHON_IGNORES = ("__pycache__/", "*.py[cod]")


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
    ignore = project / ".gitignore"
    for path in (instructions, ignore):
        if path.is_symlink():
            raise ValueError(f"Refusing symlinked setup file: {path}")

    existing = instructions.read_bytes().decode("utf-8") if instructions.exists() else ""
    updated = build_instructions(existing)
    existing_ignore = ignore.read_bytes().decode("utf-8") if ignore.exists() else ""
    missing = [pattern for pattern in PYTHON_IGNORES if pattern not in existing_ignore.splitlines()]
    updated_ignore = existing_ignore
    if missing:
        separator = "\n" if existing_ignore and not existing_ignore.endswith("\n") else ""
        updated_ignore += separator + "\n".join(missing) + "\n"

    is_current = True
    for path, original, replacement in (
        (instructions, existing, updated),
        (ignore, existing_ignore, updated_ignore),
    ):
        if original == replacement:
            print(f"Current setup file: {path}")
            continue
        if check:
            print(f"Missing or outdated setup file: {path}")
            is_current = False
            continue

        path.write_bytes(replacement.encode("utf-8"))
        print(f"Updated setup file: {path}")

    return is_current


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
