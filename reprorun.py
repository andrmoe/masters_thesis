"""Build repaired source and record one container execution."""
import argparse
from datetime import datetime, timezone
import json
from pathlib import Path, PurePosixPath
import re
import subprocess
import sys
import tempfile

from reproenv import read_companion

FIELDS = {
    "format", "repository", "image", "experiments", "analyses", "command",
    "working_directory", "exit_code", "outputs", "unattempted_experiments", "assessments",
}


def require(condition, message):
    if not condition:
        raise ValueError(message)


def string_list(value, nonempty=False):
    return (isinstance(value, list) and (bool(value) or not nonempty)
            and all(isinstance(item, str) and item and "\0" not in item for item in value))


def artifact_path(artifact, name):
    require(isinstance(name, str), "Artifact paths must be strings")
    path = artifact / name
    require(not Path(name).is_absolute() and path.resolve().is_relative_to(artifact),
            f"Path escapes artifact: {name}")
    return path


def load_plan(artifact):
    for name in ("reproduction.json", "study.json", "Dockerfile", "repair.diff", "repair_log.jsonl"):
        path = artifact_path(artifact, name)
        require(path.is_file() and not path.is_symlink(), f"Required regular file: {name}")
    plan = read_companion(artifact, "reproduction.json")
    require(isinstance(plan, dict) and set(plan) == FIELDS, "Unexpected or missing reproduction fields")
    require(plan["format"] == 3, "Only reproduction format 3 is supported")
    repo = plan["repository"]
    require(isinstance(repo, dict) and set(repo) == {"url", "commit"}, "Expected repository.url and repository.commit")
    require(isinstance(repo["url"], str) and bool(repo["url"]), "Repository URL is required")
    require(isinstance(repo["commit"], str) and re.fullmatch(r"[0-9a-f]{40}|[0-9a-f]{64}", repo["commit"]),
            "Use a full source commit hash")
    require(plan["image"] is None or (isinstance(plan["image"], str) and re.fullmatch(r"sha256:[0-9a-f]{64}", plan["image"])),
            "Image must be null before building, or an image ID")
    require(plan["exit_code"] is None and plan["outputs"] is None,
            "Execution already recorded; create a new reproduction directory")
    require(string_list(plan["command"], nonempty=True), "Command must be a nonempty argument array")
    require(string_list(plan["experiments"], nonempty=True), "Experiments must be a nonempty ID array")
    require(len(set(plan["experiments"])) == len(plan["experiments"]), "Experiment IDs must be unique")
    require(string_list(plan["analyses"]), "Analyses must be an ID array")
    require(len(set(plan["analyses"])) == len(plan["analyses"]), "Analysis IDs must be unique")
    require(isinstance(plan["working_directory"], str) and plan["working_directory"].startswith("/")
            and "\0" not in plan["working_directory"], "Working directory must be absolute")
    study = read_companion(artifact, "study.json")
    require(isinstance(study, dict) and isinstance(study.get("Experiments"), dict)
            and isinstance(study.get("Analyses"), dict), "Study must contain Experiments and Analyses objects")
    experiments, analyses = study["Experiments"], study["Analyses"]
    require(set(plan["experiments"]) <= experiments.keys(), "Unknown study experiment ID")
    require(set(plan["analyses"]) <= analyses.keys(), "Unknown study analysis ID")
    omitted = plan["unattempted_experiments"]
    require(isinstance(omitted, list), "Unattempted experiments must be an array")
    for item in omitted:
        require(isinstance(item, dict) and set(item) == {"experiment", "reason"}
                and isinstance(item["experiment"], str) and item["experiment"] in experiments
                and isinstance(item["reason"], str)
                and bool(item["reason"]), "Invalid unattempted experiment")
    omitted_ids = [item["experiment"] for item in omitted]
    require(len(omitted_ids) == len(set(omitted_ids)), "Duplicate unattempted experiment")
    require(not set(omitted_ids) & set(plan["experiments"]), "Planned experiments cannot already be skipped")
    require(set(plan["experiments"]) | set(omitted_ids) == experiments.keys(), "Account for every study experiment")
    require(isinstance(plan["assessments"], list), "Assessments must be an array")
    for assessment in plan["assessments"]:
        require(isinstance(assessment, dict) and set(assessment) == {"analysis", "path"}
                and isinstance(assessment["analysis"], str)
                and assessment["analysis"] in plan["analyses"], "Invalid assessment analysis")
        path = artifact_path(artifact, assessment["path"])
        require(PurePosixPath(assessment["path"]).parts[0] == "results" and path != artifact / "results",
                "Assessments must be inside results/")
    for analysis_id in plan["analyses"]:
        analysis = analyses[analysis_id]
        require(isinstance(analysis, dict) and string_list(analysis.get("experiments"), nonempty=True)
                and set(analysis["experiments"]) <= set(plan["experiments"]),
                "Analysis must refer to scheduled experiments")
    results = artifact_path(artifact, "results")
    require(not results.is_symlink() and (not results.exists() or results.is_dir()), "Results must be a regular directory")
    require(not results.exists() or not any(results.iterdir()), "Results already exist; create a new reproduction directory")
    return plan


def save_plan(artifact, plan):
    with tempfile.NamedTemporaryFile(mode="w", dir=artifact, delete=False) as handle:
        temp = Path(handle.name)
        json.dump(plan, handle, indent=2)
        handle.write("\n")
    temp.replace(artifact / "reproduction.json")


def log(artifact, action, reason):
    entry = {"time": datetime.now(timezone.utc).isoformat(), "action": action, "reason": reason}
    with (artifact / "repair_log.jsonl").open("a") as handle:
        handle.write(json.dumps(entry) + "\n")


def checked(command, cwd=None):
    result = subprocess.run(command, cwd=cwd, capture_output=True, text=True)
    if result.returncode:
        raise RuntimeError(f"{command[0]} {command[1]} failed ({result.returncode}):\n{result.stderr[-4000:]}")
    return result.stdout.strip()


def prepare_source(source, commit, patch, destination):
    """Never build from unrelated local edits; check out only the declared commit."""
    checked(["git", "clone", "--quiet", "--no-checkout", "--", str(source), str(destination)])
    checked(["git", "checkout", "--quiet", "--detach", commit], cwd=destination)
    actual = checked(["git", "rev-parse", "HEAD"], cwd=destination)
    require(actual == commit, "Checked-out commit differs from execution plan")
    if patch.stat().st_size:
        checked(["git", "apply", "--check", str(patch)], cwd=destination)
        checked(["git", "apply", str(patch)], cwd=destination)


def output_files(artifact):
    paths = []
    for path in sorted((artifact / "results").rglob("*")):
        require(not path.is_symlink(), f"Output symlinks are unsupported: {path}")
        require(path.is_file() or path.is_dir(), f"Output must be a regular file or directory: {path}")
        if path.is_file():
            relative = path.relative_to(artifact).as_posix()
            if relative not in ("results/stdout.txt", "results/stderr.txt"):
                paths.append(relative)
    return paths


def execute(artifact, source, inputs=None):
    artifact, source = Path(artifact).resolve(), Path(source).resolve()
    if inputs is not None:
        inputs = Path(inputs).resolve()
        require(inputs.is_dir(), "Input directory does not exist")
    lock = artifact / ".runner.lock"
    with lock.open("x"):
        pass
    container = None
    validated = False
    try:
        plan = load_plan(artifact)
        validated = True
        checked(["docker", "info"])
        log(artifact, "Start execution runner", "Reconstruct pinned source, build image, then execute one container with internet access.")
        with tempfile.TemporaryDirectory(prefix="reprorun-") as tmp:
            context = Path(tmp) / "source"
            prepare_source(source, plan["repository"]["commit"], artifact / "repair.diff", context)
            iidfile = Path(tmp) / "image.id"
            print("Building repaired source…", flush=True)
            checked(["docker", "build", "--quiet", "--iidfile", str(iidfile),
                     "--file", str(artifact / "Dockerfile"), str(context)])
            image = iidfile.read_text().strip()
            require(bool(re.fullmatch(r"sha256:[0-9a-f]{64}", image)), "Docker did not return an immutable image ID")
            plan["image"] = image
            save_plan(artifact, plan)
            log(artifact, "Built container image", image)
        results = artifact / "results"
        results.mkdir(exist_ok=True)
        command = ["docker", "create", "--workdir", plan["working_directory"],
                   "--env", "REPRO_RESULTS=/results", "--network", "bridge",
                   "--mount", f"type=bind,source={results},target=/results",
                   "--entrypoint", plan["command"][0]]
        if inputs is not None:
            command += ["--env", "REPRO_INPUT=/input", "--mount", f"type=bind,source={inputs},target=/input,readonly"]
            log(artifact, "Mount input data", str(inputs))
        container = checked(command + [image] + plan["command"][1:])
        require(bool(re.fullmatch(r"[0-9a-f]{12,64}", container)), "Docker did not return a container ID")
        print("Running experiments sequentially in one container…", flush=True)
        with (results / "stdout.txt").open("xb") as stdout, (results / "stderr.txt").open("xb") as stderr:
            attached = subprocess.run(["docker", "start", "--attach", container], stdout=stdout, stderr=stderr)
        state = json.loads(checked(["docker", "inspect", "--format", "{{json .State}}", container]))
        require(state["Status"] == "exited" and not state.get("Error"),
                f"Container did not complete: {state.get('Error') or state['Status']}")
        require(attached.returncode == state["ExitCode"], "Docker attachment failed; execution capture may be incomplete")
        plan["exit_code"] = state["ExitCode"]
        plan["outputs"] = {"stdout": "results/stdout.txt", "stderr": "results/stderr.txt", "files": []}
        save_plan(artifact, plan)
        plan["outputs"]["files"] = output_files(artifact)
        save_plan(artifact, plan)
        log(artifact, "Recorded container execution", f"Exit code {plan['exit_code']}; stdout, stderr and outputs preserved.")
        if plan["exit_code"]:
            log(artifact, "Review failed execution", "Agent or researcher must identify skipped experiments and update unattempted_experiments; the runner cannot infer progress inside the entry command.")
        print(f"Recorded exit code {plan['exit_code']} in {artifact / 'reproduction.json'}", flush=True)
        return plan["exit_code"]
    except BaseException as error:
        if validated:
            log(artifact, "Execution runner stopped", str(error))
        raise
    finally:
        try:
            if container:
                cleanup = subprocess.run(["docker", "rm", "--force", "--volumes", container], capture_output=True, text=True)
                if cleanup.returncode:
                    print(f"reprorun: could not remove container {container}: {cleanup.stderr}", file=sys.stderr)
        finally:
            lock.unlink()


def main(argv=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("artifact", type=Path, help="Unexecuted reproduction directory")
    parser.add_argument("--source", type=Path, default=Path.cwd(), help="Local Git source repository (default: current directory)")
    parser.add_argument("--input", type=Path, help="Prepared data mounted read-only at /input")
    args = parser.parse_args(argv)
    try:
        return execute(args.artifact, args.source, args.input)
    except KeyboardInterrupt:
        print("reprorun: interrupted; outputs retained", file=sys.stderr)
        return 130
    except (OSError, ValueError, RuntimeError) as error:
        print(f"reprorun: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
