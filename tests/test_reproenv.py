import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

import reproenv

ROOT = Path(__file__).resolve().parent.parent


def make(folder, name):
    path = folder / name
    path.mkdir(parents=True)
    (path / "manifest.json").write_text("{}")
    return path


class FindTests(unittest.TestCase):
    def test_newest_in_repo_found_from_subdirectory(self):
        with tempfile.TemporaryDirectory() as tmp:
            repo = Path(tmp)
            subprocess.run(["git", "init", "-q", repo], check=True)
            make(repo / ".reproenv", "20260101T000000Z")
            newest = make(repo / ".reproenv", "20261008T121606Z")
            (repo / "analysis").mkdir()
            self.assertEqual(reproenv.find_newest(repo / "analysis"), newest)

    def test_reproduction_given_directly(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = make(Path(tmp), "20261008T121606Z")
            self.assertEqual(reproenv.find_newest(path), path)

    def test_nothing_found(self):
        with tempfile.TemporaryDirectory() as tmp:
            self.assertIsNone(reproenv.find_newest(Path(tmp)))


class ExampleTests(unittest.TestCase):
    def test_example(self):
        result = subprocess.run([sys.executable, ROOT / "reproenv.py", ROOT / "examples" / "msf-cnn"],
                                capture_output=True, text=True, check=True)
        self.assertIn("https://github.com/TinyPART/msf-CNN at commit fd74a7c", result.stdout)
        self.assertIn("No changes to the code.", result.stdout)
        self.assertIn("FROM python:3.11-slim", result.stdout)
        self.assertNotIn("Entry point", result.stdout)


if __name__ == "__main__":
    unittest.main()
