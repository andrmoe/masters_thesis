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
    (path / "reproduction.json").write_text('{"format": 3}')
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


class ViewerTests(unittest.TestCase):
    def test_current_format_shows_container_and_experiment_order(self):
        import json

        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp)
            record = {
                "format": 3,
                "repository": {"url": "https://example.org/source", "commit": "abc123"},
                "image": "sha256:example",
                "experiments": ["experiment_1", "experiment_2"],
                "analyses": ["analysis_1"], "command": ["./run_experiments.sh"],
                "working_directory": "/work", "exit_code": 0,
                "outputs": {"stdout": "results/stdout.txt",
                            "stderr": "results/stderr.txt", "files": []},
                "unattempted_experiments": [],
                "assessments": [{"analysis": "analysis_1",
                                 "path": "results/assessment.md"}],
            }
            (path / "reproduction.json").write_text(json.dumps(record))
            result = subprocess.run([sys.executable, ROOT / "reproenv.py", path],
                                    capture_output=True, text=True, check=True)
            self.assertIn("https://example.org/source at commit abc123", result.stdout)
            self.assertIn("One container: exit code 0", result.stdout)
            self.assertIn("Experiment order: experiment_1, experiment_2", result.stdout)
            self.assertIn("analysis_1: results/assessment.md", result.stdout)
            self.assertNotIn("matched", result.stdout)

    def test_version_one_still_readable(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp)
            (path / "manifest.json").write_text('{"format": 1}')
            result = subprocess.run([sys.executable, ROOT / "reproenv.py", path],
                                    capture_output=True, text=True, check=True)
            self.assertIn("No Dockerfile.", result.stdout)
            self.assertNotIn("== Comparison ==", result.stdout)

    def test_companion_cannot_escape_artifact(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp)
            artifact = path / "artifact"
            artifact.mkdir()
            (path / "outside.json").write_text('{}')
            for name in ('../outside.json', str(path / 'outside.json')):
                with self.assertRaises(ValueError):
                    reproenv.read_companion(artifact, name)
            (artifact / "link.json").symlink_to(path / "outside.json")
            with self.assertRaises(ValueError):
                reproenv.read_companion(artifact, 'link.json')



if __name__ == "__main__":
    unittest.main()
