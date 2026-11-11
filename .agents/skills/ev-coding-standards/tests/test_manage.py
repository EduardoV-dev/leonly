import contextlib
import io
import shutil
import sys
import tempfile
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parents[1] / "assets"))
from manage import END, START, build_instruction_text, git, install, sync_main, validate, verify_source


SOURCE = Path(__file__).resolve().parents[3]


class InstallationTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(dir="/tmp/opencode")
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name)
        self.repo = self.root / "my-skills"
        shutil.copytree(SOURCE / "skills", self.repo / "skills")
        self.home = self.root / "home"
        self.instructions = self.home / ".config/opencode/AGENTS.md"
        self.instructions.parent.mkdir(parents=True)
        self.instructions.write_text("# Existing instructions\nKeep this content.\n")

    def install(self):
        with contextlib.redirect_stdout(io.StringIO()):
            install(self.repo, self.home)

    def test_setup_is_repeatable_and_preserves_unrelated_content(self):
        unrelated = self.home / ".agents/skills/other/SKILL.md"
        unrelated.parent.mkdir(parents=True)
        unrelated.write_text("Unrelated skill")
        self.install()
        first = self.instructions.read_text()
        self.install()
        self.assertEqual(first, self.instructions.read_text())
        self.assertTrue(first.startswith("# Existing instructions\nKeep this content.\n"))
        self.assertEqual(first.count(START), 1)
        self.assertEqual(first.count(END), 1)
        self.assertEqual(unrelated.read_text(), "Unrelated skill")
        for skill in validate(self.repo):
            self.assertEqual((self.home / ".agents/skills" / skill.name).resolve(), skill)
        commands = self.home / ".config/opencode/commands"
        self.assertEqual(list(commands.glob("*.md")), [])

    def test_loader_uses_installed_skills_without_embedding_source_paths(self):
        self.install()
        loader = self.instructions.read_text()
        self.assertNotIn(str(self.repo), loader)
        self.assertNotIn("{{skill_path}}", loader)
        self.assertIn("installed project/user skill directories", loader)
        self.assertIn("Do not search for or require", loader)

        installed = self.root / "installed/ev-coding-standards"
        shutil.copytree(self.repo / "skills/ev-coding-standards", installed)
        relocated = build_instruction_text("", installed)
        original = build_instruction_text("", self.repo / "skills/ev-coding-standards")
        self.assertEqual(relocated, original)
        self.assertFalse((installed.parent / ".git").exists())

    def test_retired_owned_commands_are_removed_without_touching_foreign_commands(self):
        for name in ("commands", "command"):
            directory = self.home / ".config/opencode" / name
            directory.mkdir(exist_ok=True)
            retired_names = (
                "ev-check.md", "ev-fix.md", "ev-code-review.md",
                "ev-clean-unused-code.md", "ev-simplify-code.md", "ev-update.md",
            )
            for name in retired_names:
                retired = directory / name
                retired.symlink_to(self.repo / "skills/ev-coding-standards/assets/commands" / name)
            foreign = directory / "ev-foreign.md"
            foreign.symlink_to(self.root / "missing-foreign.md")
            custom = directory / "ev-custom.md"
            custom.write_text("User command")

        self.install()
        self.install()
        for name in ("commands", "command"):
            directory = self.home / ".config/opencode" / name
            for name in retired_names:
                self.assertFalse((directory / name).is_symlink())
            self.assertTrue((directory / "ev-foreign.md").is_symlink())
            self.assertEqual((directory / "ev-custom.md").read_text(), "User command")

    def test_foreign_command_with_retired_name_is_preserved(self):
        collision = self.home / ".config/opencode/commands/ev-code-review.md"
        collision.parent.mkdir()
        collision.write_text("User command")
        self.install()
        self.assertEqual(collision.read_text(), "User command")

    def test_legacy_global_skill_collision_is_not_silently_shadowed(self):
        collision = self.home / ".config/opencode/skills/ev-react-rules"
        collision.mkdir(parents=True)
        with self.assertRaisesRegex(RuntimeError, "collision"):
            self.install()
        self.assertFalse((self.home / ".agents").exists())

    def test_managed_block_updates_preserve_content_on_both_sides(self):
        self.instructions.write_text(f"Before\n{START}\nOld loader\n{END}\nAfter\n")
        self.install()
        updated = self.instructions.read_text()
        self.assertTrue(updated.startswith("Before\n"))
        self.assertTrue(updated.endswith("\nAfter\n"))
        self.assertNotIn("Old loader", updated)

    def test_broken_foreign_symlink_is_preserved(self):
        collision = self.home / ".agents/skills/ev-code-rules"
        collision.parent.mkdir(parents=True)
        collision.symlink_to(self.root / "missing")
        with self.assertRaisesRegex(RuntimeError, "collision"):
            self.install()
        self.assertTrue(collision.is_symlink())

    def test_only_retired_owned_links_are_removed(self):
        active = self.home / ".agents/skills"
        active.mkdir(parents=True)
        retired = active / "ev-retired"
        retired.symlink_to(self.repo / "skills/ev-retired")
        foreign = active / "ev-external"
        foreign.symlink_to(self.root / "missing-external")
        self.install()
        self.assertFalse(retired.is_symlink())
        self.assertTrue(foreign.is_symlink())

    def test_malformed_managed_block_does_not_modify_installation(self):
        for markers in (START, END + "\n" + START, START + "\n" + START + "\n" + END):
            with self.subTest(markers=markers):
                self.instructions.write_text(markers)
                with self.assertRaisesRegex(RuntimeError, "markers"):
                    self.install()
                self.assertEqual(self.instructions.read_text(), markers)
                self.assertFalse((self.home / ".agents").exists())

    def test_invalid_source_metadata_or_links_prevent_installation(self):
        source = self.repo / "skills/ev-coding-standards/SKILL.md"
        original = source.read_text()
        for text in (original.replace("name: ev-coding-standards", "name: different"),
                     original + "\n[Missing](references/missing.md)\n"):
            with self.subTest(text=text[-60:]):
                source.write_text(text)
                with self.assertRaises(RuntimeError):
                    self.install()
                self.assertFalse((self.home / ".agents").exists())


class GitWorkflowTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(dir="/tmp/opencode")
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name)
        self.remote = self.root / "remote.git"
        self.repo = self.root / "my-skills"
        git(self.root, "init", "--bare", "-b", "main", str(self.remote))
        git(self.root, "clone", str(self.remote), str(self.repo))
        (self.repo / "rule.md").write_text("Original rule\n")
        self.commit(self.repo, "Initial rules")
        git(self.repo, "push", "-u", "origin", "main")
        self.writer = self.root / "upstream-writer"
        git(self.root, "clone", str(self.remote), str(self.writer))

    def commit(self, repo, message):
        git(repo, "add", ".")
        git(repo, "-c", "user.name=Test", "-c", "user.email=test@example.test",
            "commit", "-m", message)

    def advance_upstream(self, text="Concurrent rule\n"):
        (self.writer / "rule.md").write_text(text)
        self.commit(self.writer, "Update upstream rule")
        git(self.writer, "push", "origin", "main")

    def test_sync_fast_forwards_to_concurrent_upstream(self):
        self.advance_upstream()
        with contextlib.redirect_stdout(io.StringIO()):
            sync_main(self.repo)
        self.assertEqual((self.repo / "rule.md").read_text(), "Concurrent rule\n")
        self.assertEqual(git(self.repo, "rev-parse", "HEAD"),
                         git(self.writer, "rev-parse", "HEAD"))

    def test_dirty_checkout_is_preserved(self):
        local = self.repo / "untracked.md"
        local.write_text("User work")
        before = git(self.repo, "rev-parse", "HEAD")
        with self.assertRaisesRegex(RuntimeError, "dirty"):
            sync_main(self.repo)
        self.assertEqual(local.read_text(), "User work")
        self.assertEqual(git(self.repo, "rev-parse", "HEAD"), before)

    def test_divergence_is_rejected_without_losing_either_change(self):
        (self.repo / "local.md").write_text("Local rule")
        self.commit(self.repo, "Local contribution")
        before = git(self.repo, "rev-parse", "HEAD")
        self.advance_upstream()
        with self.assertRaises(RuntimeError):
            sync_main(self.repo)
        self.assertEqual(git(self.repo, "rev-parse", "HEAD"), before)
        self.assertEqual((self.repo / "local.md").read_text(), "Local rule")
        self.assertEqual(git(self.remote, "rev-parse", "main"),
                         git(self.writer, "rev-parse", "HEAD"))

    def test_wrong_branch_is_rejected_without_switching(self):
        git(self.repo, "switch", "-c", "local-work")
        with self.assertRaisesRegex(RuntimeError, "Expected main"):
            sync_main(self.repo)
        self.assertEqual(git(self.repo, "branch", "--show-current"), "local-work")

    def test_unpublished_main_commits_are_not_treated_as_synchronized(self):
        (self.repo / "local.md").write_text("Unpublished rule")
        self.commit(self.repo, "Local contribution")
        before = git(self.repo, "rev-parse", "HEAD")
        with self.assertRaisesRegex(RuntimeError, "unpublished commits"):
            sync_main(self.repo)
        self.assertEqual(git(self.repo, "rev-parse", "HEAD"), before)

    def test_foreign_origin_is_rejected(self):
        with self.assertRaisesRegex(RuntimeError, "Expected origin"):
            verify_source(self.repo)
        git(self.repo, "remote", "set-url", "origin", "git@github.com:EduardoV-dev/my-skills.git")
        verify_source(self.repo)


if __name__ == "__main__":
    unittest.main()
