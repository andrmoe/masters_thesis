# Reproduction artifact format

**AI-written:** This document was written by Codex at the author's request.

A reproduction is one directory with these required files:

```text
study.json
Dockerfile
reproduction.json
repair.diff
repair_log.jsonl
results/
```

`study.json` describes the paper. `Dockerfile`, `repair.diff`, and
`repair_log.jsonl` describe the environment and repairs. `reproduction.json`
connects one container execution and its recorded outputs to the study. Each
reproduction starts one container and runs its experiments sequentially. A later
execution gets a new reproduction directory. Build and repair attempts belong in
the repair log.

## Study

Keep `study.json` compatible with Snelleman's
[study prompt](https://github.com/thijssnelleman/automated-reproducibility/blob/8ae48ba42b8389443c5fee87bfa5083d1aa75f31/study_prompt.yaml)
and [review compiler](https://github.com/thijssnelleman/automated-reproducibility/blob/8ae48ba42b8389443c5fee87bfa5083d1aa75f31/review_compiler.py).
Preserve its section names, fields and IDs. It describes the original paper;
record our execution evidence in `reproduction.json` and `results/`.

To generate an upstream review, copy it to `llm_output/<paper>.json` and run
`python review_compiler.py llm_output/<paper>.json` from the upstream repository.
Record the extraction method, review notes and upstream revision in the repair log.

## Environment and repairs

The Dockerfile builds the environment for the repaired source. `repair.diff` is
relative to the original source commit and is empty if no code repair was needed.
Each repair log line is a JSON object with `time` (UTC timestamp), `action`
(description), and `reason` (explanation). Record commands, failures, diagnoses,
source archive origins, data provenance and decisions here.

## Reproduction record

`reproduction.json` has these required fields, with no optional extension fields:

| Field | Meaning |
| --- | --- |
| `format` | `3`, distinguishing this layout from earlier manifest layouts |
| `repository` | Object with `url` and `commit`, identifying the original source |
| `image` | Image ID filled by the runner; null in an execution plan |
| `experiments` | Ordered, nonempty list of study experiment IDs scheduled for this execution |
| `analyses` | List of study analysis IDs performed during execution; empty when none are performed |
| `command` | Nonempty array of executable and arguments for the container's single entry command |
| `working_directory` | Absolute directory inside the container |
| `exit_code` | Integer container exit code filled by the runner; null before execution |
| `outputs` | Object with `stdout`, `stderr`, and `files` (array of other output paths), filled by the runner; null before execution |
| `unattempted_experiments` | Array of objects with `experiment` (study ID) and `reason` |
| `assessments` | Array of objects with `analysis` (study ID) and `path` (assessment file in `results/`) |

The entry command runs the scheduled experiments in order, waiting for each to
finish before starting the next, in the same container. It may invoke a script
stored in the repaired repository. The command and script must propagate failures:
stop at the first failed experiment and exit nonzero. Do not launch separate
containers or parallel experiment processes. Internal computation within an
experiment is unrestricted.

`experiments` records the declared order, even if execution stops early. Every study
experiment must be scheduled or listed in `unattempted_experiments`. Experiments
skipped after a failure also appear in `unattempted_experiments`, with the reason.
Retain partial outputs and the nonzero container exit code. The entry script
should make progress visible in its logs. After a failure, the agent or researcher
must update skipped experiments and remove analyses that were not performed; the
runner cannot infer progress inside an arbitrary command. Analysis references must
concern experiments actually attempted during this execution.

The runner mounts `results/` at `/results` and sets `REPRO_RESULTS=/results`. The
entry script must write persistent experiment outputs there; other changes in
the container are discarded when it is removed. The runner captures stdout and
stderr as `results/stdout.txt` and `results/stderr.txt`; these names are reserved.
Other files are inventoried in `outputs.files`.

All output paths are relative to the reproduction directory, remain inside it,
and point to files under `results/`. Save the container's combined stdout and
stderr streams to separate files, even when empty. Commands are data; opening an
artifact must not execute them. A zero exit code records successful execution;
it makes no claim about scientific agreement.

Assessments can be text, measurements, figures, or comparisons, with no prescribed
comparison schema or agreement flag. State the evidence, method and limitations.
Outcomes are observations, not optimization targets. Declare comparison criteria
before inspecting results and retain differences as findings.

The repair agent writes the plan before execution, retaining every required key
and using null for `image`, `exit_code`, and `outputs`. The other fields describe
the intended execution. The runner fills these three fields and appends operational
records to the repair log. It does not edit the study or write scientific assessments.

Files may be incomplete during work. A finished artifact has every required field
and file; empty arrays express no entries. If the environment cannot be built,
retain the incomplete directory and repair log without presenting it as finished.

Before publishing, check required fields, study references, experiment coverage,
output paths, file existence, and path containment. The current
`reproenv` command is a viewer. `reprorun` performs basic plan validation and
execution; a full format validator remains planned software.


## Executing a plan

Install with `python3 -m pip install -e .`. Git and a locally accessible Docker
Engine are required. From a reproduction directory prepared by the repair agent:

```bash
reprorun /path/to/artifact --source /path/to/source-repository
```

The runner checks out `repository.commit` in a temporary clone, applies
`repair.diff`, and builds with the artifact's Dockerfile and the repaired checkout
as build context. Local source modifications and untracked files are excluded.
The repaired entry script must be present at that revision or included in the diff.
The explicit command overrides the image's default entrypoint and command.
Internet access is enabled during build and execution.

Use `--input /path/to/data` to mount prepared data read-only at `/input`, with
`REPRO_INPUT=/input`. Experiment data can also be downloaded inside the container.
Record data origins and checksums in the repair log.

The CLI returns the container exit code. Build, startup and capture errors leave
`exit_code` null rather than invent an experiment outcome. Available logs and
partial outputs are retained. The container is removed afterward. A completed
record or nonempty results directory cannot be overwritten; create a new
reproduction directory for another execution. A `.runner.lock` prevents concurrent
runners from using the same artifact. Remove a stale lock manually only after
checking that its runner is no longer active.

Run the standard tests with `python3 -m unittest discover -s tests -v`. To include
the real-container test on a Docker host:

```bash
REPROENV_DOCKER_TEST=1 python3 -m unittest discover -s tests -v
```
