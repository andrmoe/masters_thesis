# Paper repair observatory

**AI-written:** This app, documentation, and paper-screening rationale were written by Codex.

A buildless static viewer for the [seven-paper campaign](PAPERS.md). It includes the seven investigated papers with submitted reproduction artifacts. It reads canonical
format-3 reproduction artifacts directly, keeping Snelleman-compatible `study.json`
unchanged. There is no backend, database, dependency installation, or build step.

From the repository root:

```sh
python3 -m http.server 8000
```

Open `http://localhost:8000/reproductions/`. Browser fetches require HTTP; opening
`index.html` directly as a local file will not work reliably.

The repository's existing GitHub Pages workflow uploads the repository root.
After merging, the viewer is available at `/reproductions/` under the site's
configured domain. All asset and artifact URLs are relative, so GitHub project
Pages paths also work. Hosting remains under the researcher's control.

## Local result files

Artifact `results/` folders are excluded from Git and retained locally. Canonical records, inventories, and displayed file trees still describe the original runs, but result downloads, plots, logs, and assessments under those folders are unavailable in a fresh checkout or the published site.

## Add an observed artifact

Repair agents work outside the website. Export a finished or honestly incomplete
artifact with its required canonical files:

```sh
python3 tools/export_artifacts.py ensemble /path/to/attempt-0001
```

Use the paper ID from `papers.json`. The exporter copies the artifact without
rewriting its study, repair, or execution records; adds a separate `files.json`
inventory with SHA-256 hashes; and adds the attempt to that paper's catalog entry.
Repeating the command updates the same attempt. A different directory name adds
another reproduction. Symlinks are rejected, hidden files excluded, and artifacts
above 100 MiB require manual review before publication. Export only intended
research evidence: the command publishes every nonhidden file in the directory.

The viewer provides:

- A diff-first view with a searchable selector for every published attempt, including earlier failures.
- The agent-submitted Dockerfile, then a browsable results file tree, then the code diff.
- Per-file unified diffs with original/repaired line numbers and highlighted removals/additions.
- Amber highlighting for the agent’s submitted plan, environment, patch, and assessments; green for runner-recorded evidence.
- Search across paper titles, fields, and languages, with previous/next paper buttons.
- Open the latest successful execution by default; inspect unsuccessful attempts in separate tabs. Explicit attempt links retain their selection.
- One container's command, source revision, image, and exit code.
- Declared experiment order, unattempted experiments, and recorded analyses.
- Assessments, captured output, repair history, code diff, and Dockerfile.
- Original artifact downloads, with images and text previews.

Status comes from `reproduction.json`, never from an agent's success claim.
Null exit codes remain incomplete, including builds that failed before a container
started. A zero exit code means **executed**, not scientifically reproduced.
The declared schedule alone does not establish that every experiment completed.
Missing or unreadable artifacts remain visible as unavailable.

## Checks

```sh
python3 -m unittest tests/test_export_artifacts.py
node --test tests/viewer.test.mjs
```

No artifact commands or downloaded HTML are executed by the viewer. AI-written
interpretations are labeled separately from original author material and captured
program output. The full paper extraction still needs researcher review.
