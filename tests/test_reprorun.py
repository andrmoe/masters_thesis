"""Exercise orchestration with real Git and a simulated Docker boundary."""
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest
from unittest.mock import patch

import reprorun

REAL_RUN = subprocess.run
IMAGE = "sha256:" + "a" * 64
CONTAINER = "b" * 64


class RunnerTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.source = self.root / "original"
        self.source.mkdir()
        self.git("init", "-q")
        (self.source / "value.txt").write_text("original\n")
        (self.source / "experiments.sh").write_text("#!/bin/sh\nset -e\nprintf 'one\\n'\nprintf 'two\\n'\n")
        self.git("add", ".")
        self.git("-c", "user.name=Test", "-c", "user.email=test@example.org", "commit", "-qm", "Original")
        self.commit = self.git("rev-parse", "HEAD").stdout.strip()
        (self.source / "value.txt").write_text("repaired\n")
        diff = self.git("diff").stdout
        # These unrelated local edits must never enter the Docker build context.
        (self.source / "value.txt").write_text("unrelated local edit\n")
        (self.source / "untracked.txt").write_text("do not build me")
        self.artifact = self.root / "artifact"
        self.artifact.mkdir()
        self.plan = {
            "format": 3, "repository": {"url": "https://example.org/original", "commit": self.commit},
            "image": None, "experiments": ["experiment_1", "experiment_2"], "analyses": [],
            "command": ["/bin/sh", "/work/experiments.sh"], "working_directory": "/work",
            "exit_code": None, "outputs": None, "unattempted_experiments": [], "assessments": [],
        }
        self.write_plan()
        (self.artifact / "study.json").write_text(json.dumps({
            "Experiments": {"experiment_1": {}, "experiment_2": {}}, "Analyses": {}}))
        (self.artifact / "repair.diff").write_text(diff)
        (self.artifact / "repair_log.jsonl").touch()
        (self.artifact / "Dockerfile").write_text("FROM busybox:1.37\nWORKDIR /work\nCOPY . .\n")
        self.calls = []
        self.container_exit = 0
        self.start_error = ""
        self.build_error = False
        self.interrupt = False

    def git(self, *args):
        return REAL_RUN(["git", *args], cwd=self.source, check=True, capture_output=True, text=True)

    def write_plan(self):
        (self.artifact / "reproduction.json").write_text(json.dumps(self.plan))

    def docker(self, command, **kwargs):
        if command[0] != "docker":
            return REAL_RUN(command, **kwargs)
        self.calls.append(command)
        action = command[1]
        stdout, stderr, code = "", "", 0
        if action == "build":
            context = Path(command[-1])
            self.assertEqual((context / "value.txt").read_text(), "repaired\n")
            self.assertFalse((context / "untracked.txt").exists())
            if self.build_error:
                code, stderr = 1, "compiler failed"
            else:
                Path(command[command.index("--iidfile") + 1]).write_text(IMAGE)
        elif action == "create":
            stdout = CONTAINER
        elif action == "start":
            kwargs["stdout"].write(b"experiment one\n")
            kwargs["stderr"].write(b"diagnostic\n")
            (self.artifact / "results" / "measurement.json").write_text('{"value": 42}')
            if self.interrupt:
                raise KeyboardInterrupt()
            code = self.container_exit
        elif action == "inspect":
            stdout = json.dumps({"Status": "exited" if not self.start_error else "created",
                                 "ExitCode": self.container_exit, "Error": self.start_error})
        return subprocess.CompletedProcess(command, code, stdout, stderr)

    def run_fake(self, **kwargs):
        with patch("reprorun.subprocess.run", side_effect=self.docker):
            return reprorun.execute(self.artifact, self.source, **kwargs)

    def test_builds_pinned_repaired_source_and_records_single_container(self):
        data = self.root / "input"
        data.mkdir()
        self.assertEqual(self.run_fake(inputs=data), 0)
        result = json.loads((self.artifact / "reproduction.json").read_text())
        self.assertEqual(result["image"], IMAGE)
        self.assertEqual(result["exit_code"], 0)
        self.assertEqual(result["outputs"]["files"], ["results/measurement.json"])
        self.assertEqual((self.artifact / result["outputs"]["stdout"]).read_bytes(), b"experiment one\n")
        self.assertEqual((self.artifact / result["outputs"]["stderr"]).read_bytes(), b"diagnostic\n")
        creates = [cmd for cmd in self.calls if cmd[1] == "create"]
        self.assertEqual(len(creates), 1)
        command = creates[0]
        self.assertEqual(command[command.index("--entrypoint") + 1], "/bin/sh")
        self.assertEqual(command[-2:], [IMAGE, "/work/experiments.sh"])
        self.assertIn("bridge", command)
        self.assertIn(f"type=bind,source={data},target=/input,readonly", command)
        self.assertEqual(self.calls[-1][1:4], ["rm", "--force", "--volumes"])
        self.assertEqual((self.source / "value.txt").read_text(), "unrelated local edit\n")
        self.assertFalse((self.artifact / ".runner.lock").exists())
        with self.assertRaisesRegex(ValueError, "already recorded"):
            self.run_fake()

    def test_failed_experiment_keeps_actual_exit_and_partial_outputs(self):
        self.container_exit = 23
        self.assertEqual(self.run_fake(), 23)
        result = json.loads((self.artifact / "reproduction.json").read_text())
        self.assertEqual(result["exit_code"], 23)
        self.assertTrue((self.artifact / "results/measurement.json").exists())
        self.assertEqual(result["unattempted_experiments"], [])  # No guessed progress.
        self.assertIn("identify skipped experiments", (self.artifact / "repair_log.jsonl").read_text())

    def test_build_failure_never_starts_container_or_invents_exit_code(self):
        self.build_error = True
        with self.assertRaisesRegex(RuntimeError, "compiler failed"):
            self.run_fake()
        self.assertFalse(any(cmd[1] == "create" for cmd in self.calls))
        result = json.loads((self.artifact / "reproduction.json").read_text())
        self.assertIsNone(result["exit_code"])
        self.assertFalse((self.artifact / ".runner.lock").exists())

    def test_start_failure_is_not_an_experiment_exit(self):
        self.start_error = "runtime failed"
        with self.assertRaisesRegex(ValueError, "runtime failed"):
            self.run_fake()
        self.assertIsNone(json.loads((self.artifact / "reproduction.json").read_text())["exit_code"])
        self.assertEqual(self.calls[-1][1], "rm")
        self.assertTrue((self.artifact / "results/stdout.txt").is_file())

    def test_interrupt_removes_container_and_preserves_logs(self):
        self.interrupt = True
        with self.assertRaises(KeyboardInterrupt):
            self.run_fake()
        self.assertEqual(self.calls[-1][1], "rm")
        self.assertTrue((self.artifact / "results/stdout.txt").is_file())
        self.assertFalse((self.artifact / ".runner.lock").exists())

    def test_existing_outputs_unknown_experiment_and_escape_rejected_before_docker(self):
        self.plan["experiments"] = ["not_in_study"]
        self.write_plan()
        with self.assertRaisesRegex(ValueError, "Unknown study experiment"):
            self.run_fake()
        self.assertEqual(self.calls, [])
        self.plan["experiments"] = ["experiment_1", "experiment_2"]
        self.write_plan()
        (self.artifact / "results").symlink_to(self.root, target_is_directory=True)
        with self.assertRaisesRegex(ValueError, "Path escapes"):
            self.run_fake()
        self.assertEqual(self.calls, [])

    def test_existing_outputs_are_never_overwritten(self):
        results = self.artifact / "results"
        results.mkdir()
        (results / "stdout.txt").write_text("previous evidence")
        with self.assertRaisesRegex(ValueError, "Results already exist"):
            self.run_fake()
        self.assertEqual((results / "stdout.txt").read_text(), "previous evidence")
        self.assertEqual(self.calls, [])

    def test_output_symlinks_are_rejected(self):
        results = self.artifact / "results"
        results.mkdir()
        (results / "escaped").symlink_to(self.source / "value.txt")
        with self.assertRaisesRegex(ValueError, "Output symlinks"):
            reprorun.output_files(self.artifact)

    def test_existing_lock_is_not_removed(self):
        lock = self.artifact / ".runner.lock"
        lock.touch()
        with self.assertRaises(FileExistsError):
            self.run_fake()
        self.assertTrue(lock.exists())

    @unittest.skipUnless(os.environ.get("REPROENV_DOCKER_TEST") == "1", "Set REPROENV_DOCKER_TEST=1 for a real Docker execution")
    def test_real_docker_sequential_execution_and_failure(self):
        self.assertIsNotNone(shutil.which("docker"))
        checked = REAL_RUN(["docker", "info"], capture_output=True)
        self.assertEqual(checked.returncode, 0, checked.stderr.decode())
        script = ('#!/bin/sh\nset -e\n'
                  'printf "first\\n" > "$REPRO_RESULTS/order.txt"\n'
                  'test "$(cat "$REPRO_RESULTS/order.txt")" = first\n'
                  'printf "second\\n" >> "$REPRO_RESULTS/order.txt"\n'
                  'printf "stdout\\n"\nprintf "stderr\\n" >&2\nexit 23\n'
                  'printf "must not run\\n" >> "$REPRO_RESULTS/order.txt"\n')
        (self.source / "experiments.sh").write_text(script)
        # Produce a patch against the pinned original, including both repairs.
        (self.source / "value.txt").write_text("repaired\n")
        (self.artifact / "repair.diff").write_text(self.git("diff").stdout)
        with (self.artifact / "Dockerfile").open("a") as handle:
            handle.write('ENTRYPOINT ["/bin/false"]\nCMD ["unused"]\n')
        self.assertEqual(reprorun.execute(self.artifact, self.source), 23)
        result = json.loads((self.artifact / "reproduction.json").read_text())
        self.assertEqual(result["exit_code"], 23)
        self.assertEqual((self.artifact / "results/order.txt").read_text(), "first\nsecond\n")
        self.assertEqual((self.artifact / "results/stdout.txt").read_text(), "stdout\n")
        self.assertEqual((self.artifact / "results/stderr.txt").read_text(), "stderr\n")
        REAL_RUN(["docker", "image", "rm", result["image"]], capture_output=True)


if __name__ == "__main__":
    unittest.main()
