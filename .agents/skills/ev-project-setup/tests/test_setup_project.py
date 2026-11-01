import contextlib
import io
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path


ASSETS = Path(__file__).resolve().parents[1] / "assets"
sys.path.insert(0, str(ASSETS))
from setup_project import END, START, setup_project


class ProjectSetupTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory(dir="/tmp/opencode")
        self.addCleanup(self.temporary.cleanup)
        self.project = Path(self.temporary.name) / "project with spaces"
        self.project.mkdir()
        self.instructions = self.project / "AGENTS.md"

    def run_setup(self, **arguments):
        with contextlib.redirect_stdout(io.StringIO()):
            return setup_project(self.project, **arguments)

    def test_creates_only_instructions_and_is_repeatable(self):
        self.assertTrue(self.run_setup())
        original = self.instructions.read_bytes()
        modified = self.instructions.stat().st_mtime_ns
        self.assertTrue(self.run_setup())
        self.assertEqual(self.instructions.read_bytes(), original)
        self.assertEqual(self.instructions.stat().st_mtime_ns, modified)
        self.assertEqual(list(self.project.iterdir()), [self.instructions])
        self.assertEqual(original.count(START.encode()), 1)
        self.assertEqual(original.count(END.encode()), 1)
        self.assertNotIn(str(self.project).encode(), original)
        self.assertNotIn(str(ASSETS).encode(), original)

    def test_appends_without_changing_existing_bytes(self):
        for original in (b"# Team\r\nPreserve UTF-8: \xc3\xa9\r\n", b"No final newline"):
            with self.subTest(original=original):
                self.instructions.write_bytes(original)
                self.run_setup()
                self.assertTrue(self.instructions.read_bytes().startswith(original))

    def test_refresh_preserves_content_on_both_sides_and_global_loader(self):
        before = "<!-- ev-coding-standards:start -->\nGlobal policy\n<!-- ev-coding-standards:end -->\r\n"
        after = "\r\n# More team instructions\r\n"
        self.instructions.write_bytes(f"{before}{START}\nOld block\n{END}{after}".encode())
        self.run_setup()
        updated = self.instructions.read_bytes().decode()
        self.assertTrue(updated.startswith(before))
        self.assertTrue(updated.endswith(after))
        self.assertNotIn("Old block", updated)
        self.assertTrue(self.run_setup(check=True))

    def test_check_detects_missing_and_outdated_wiring_without_writes(self):
        self.assertFalse(self.run_setup(check=True))
        self.assertFalse(self.instructions.exists())
        outdated = f"Before\n{START}\nOld block\n{END}\nAfter"
        self.instructions.write_text(outdated)
        self.assertFalse(self.run_setup(check=True))
        self.assertEqual(self.instructions.read_text(), outdated)

    def test_malformed_markers_preserve_existing_file(self):
        for markers in (START, END, END + START, START + START + END, START + END + START + END):
            with self.subTest(markers=markers):
                self.instructions.write_text(markers)
                with self.assertRaisesRegex(ValueError, "markers"):
                    self.run_setup()
                self.assertEqual(self.instructions.read_text(), markers)

    def test_symlinked_instructions_are_rejected_even_if_broken(self):
        target = self.project.parent / "shared.md"
        for exists in (False, True):
            with self.subTest(exists=exists):
                if exists:
                    target.write_text("Shared instructions")
                self.instructions.symlink_to(target)
                with self.assertRaisesRegex(ValueError, "symlinked"):
                    self.run_setup()
                self.assertTrue(self.instructions.is_symlink())
                self.instructions.unlink()
                if exists:
                    self.assertEqual(target.read_text(), "Shared instructions")

    def test_missing_project_is_not_created(self):
        missing = self.project / "missing"
        with self.assertRaisesRegex(ValueError, "existing project"):
            setup_project(missing)
        self.assertFalse(missing.exists())

    def test_cli_handles_spaces_and_reports_check_exit_status(self):
        command = [sys.executable, "-B", str(ASSETS / "setup_project.py"), str(self.project)]
        missing = subprocess.run([*command, "--check"], capture_output=True, text=True)
        self.assertEqual(missing.returncode, 1, missing.stderr)
        installed = subprocess.run(command, capture_output=True, text=True)
        self.assertEqual(installed.returncode, 0, installed.stderr)
        current = subprocess.run([*command, "--check"], capture_output=True, text=True)
        self.assertEqual(current.returncode, 0, current.stderr)
        self.instructions.write_text(START)
        malformed = subprocess.run(command, capture_output=True, text=True)
        self.assertEqual(malformed.returncode, 1)
        self.assertIn("markers", malformed.stderr)
        self.assertEqual(self.instructions.read_text(), START)


if __name__ == "__main__":
    unittest.main()
