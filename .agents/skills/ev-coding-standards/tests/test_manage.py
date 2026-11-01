import contextlib
import io
import shutil
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

sys.path.insert(0, str(Path(__file__).parents[1] / "assets"))
from manage import END, START, git, install, start_rule, sync_main, validate, verify_source


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
        for name in ("ev-check", "ev-fix", "ev-update", "ev-add-rule"):
            command = self.home / f".config/opencode/commands/{name}.md"
            self.assertTrue(command.is_symlink())
            self.assertIn("$ARGUMENTS", command.read_text())

    def test_command_collision_prevents_all_installation_writes(self):
        collision = self.home / ".config/opencode/commands/ev-fix.md"
        collision.parent.mkdir()
        collision.write_text("User command")
        original = self.instructions.read_text()
        with self.assertRaisesRegex(RuntimeError, "collision"):
            self.install()
        self.assertFalse((self.home / ".agents").exists())
        self.assertEqual(collision.read_text(), "User command")
        self.assertEqual(self.instructions.read_text(), original)

    def test_legacy_global_skill_collision_is_not_silently_shadowed(self):
        collision = self.home / ".config/opencode/skills/ev-review-react"
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
        collision = self.home / ".agents/skills/ev-code-review"
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

    def test_rule_worktree_contains_latest_without_activating_unpublished_edits(self):
        self.advance_upstream()
        with contextlib.redirect_stdout(io.StringIO()):
            worktree = start_rule(self.repo, "new-rule")
        self.assertEqual(worktree, self.root / "my-skills-worktrees/new-rule")
        self.assertEqual((worktree / "rule.md").read_text(), "Concurrent rule\n")
        self.assertEqual(git(worktree, "branch", "--show-current"), "rules/new-rule")
        (worktree / "rule.md").write_text("Unpublished rule\n")
        self.assertEqual((self.repo / "rule.md").read_text(), "Concurrent rule\n")
        self.assertEqual(git(self.repo, "branch", "--show-current"), "main")
        with self.assertRaisesRegex(RuntimeError, "already exists"):
            start_rule(self.repo, "new-rule")

    def test_upstream_race_after_worktree_creation_is_pulled_before_edits(self):
        def race_git(repo, *arguments):
            result = git(repo, *arguments)
            if arguments[:2] == ("worktree", "add"):
                self.advance_upstream("Rule published during creation\n")
            return result

        with patch("manage.git", side_effect=race_git), contextlib.redirect_stdout(io.StringIO()):
            worktree = start_rule(self.repo, "racing-rule")
        self.assertEqual((worktree / "rule.md").read_text(), "Rule published during creation\n")
        self.assertEqual((self.repo / "rule.md").read_text(), "Original rule\n")

    def test_invalid_slug_and_foreign_origin_are_rejected(self):
        with self.assertRaisesRegex(RuntimeError, "kebab-case"):
            start_rule(self.repo, "../escape")
        with self.assertRaisesRegex(RuntimeError, "Expected origin"):
            verify_source(self.repo)
        git(self.repo, "remote", "set-url", "origin", "git@github.com:EduardoV-dev/my-skills.git")
        verify_source(self.repo)


if __name__ == "__main__":
    unittest.main()
