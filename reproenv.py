"""reproenv: show how the newest reproduction repairs the code and builds its environment."""
import json
import subprocess
import sys
from pathlib import Path


def is_reproduction(path):
    return (path / "reproduction.json").is_file() or (path / "manifest.json").is_file()


def find_newest(start):
    """The newest reproduction: start itself, or the last one in .reproenv at the repo root, or in start."""
    if is_reproduction(start):
        return start
    git = subprocess.run(["git", "-C", start, "rev-parse", "--show-toplevel"], capture_output=True, text=True)
    for folder in [Path(git.stdout.strip()) / ".reproenv" if git.returncode == 0 else None, start]:
        if folder and folder.is_dir():
            reproductions = sorted(p for p in folder.iterdir() if is_reproduction(p))
            if reproductions:
                return reproductions[-1]
    return None


def read(path):
    return path.read_text() if path.is_file() else ""


def read_companion(reproduction, name):
    path = (reproduction / name).resolve()
    if Path(name).is_absolute() or not path.is_relative_to(reproduction.resolve()):
        raise ValueError(f"Artifact path must stay inside reproduction: {name}")
    return json.loads(path.read_text())


def main():
    start = Path(sys.argv[1] if len(sys.argv) > 1 else ".").resolve()
    reproduction = find_newest(start)
    if reproduction is None:
        print(f"reproenv: no reproductions found from {start}", file=sys.stderr)
        return 1

    current = (reproduction / "reproduction.json").is_file()
    record = read_companion(reproduction, "reproduction.json" if current else "manifest.json")
    if current and record["format"] != 3:
        raise ValueError(f"Unsupported reproduction format: {record['format']}")
    repository = record.get("repository", {})

    print(f"Reproduction {reproduction.name} of {repository.get('url')} at commit {repository.get('commit')}")
    print_section("Repair", read(reproduction / "repair.diff") or "No changes to the code.")
    print_section("Environment", read(reproduction / "Dockerfile") or "No Dockerfile.")
    if current:
        status = "not executed" if record["exit_code"] is None else f"exit code {record['exit_code']}"
        print_section("Execution", f"One container: {status}\n"
                      + "Experiment order: " + ", ".join(record["experiments"]))
        print_section("Assessments", "\n".join(
            f"{item['analysis']}: {item['path']}"
            for item in record["assessments"]) or "No assessments.")
    return 0


def print_section(title, text):
    print(f"\n== {title} ==\n")
    print(text.rstrip())


if __name__ == "__main__":
    sys.exit(main())
