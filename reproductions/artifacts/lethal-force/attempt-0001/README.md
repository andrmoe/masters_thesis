# Lethal Force in Black and White — scoped forest reproduction

**AI-written:** Documentation, study extraction, environment and repair orchestration are AI-written. Original author files and data are preserved in source.bundle; repair.diff identifies changes.

Original: Shea Streeter (2019), https://doi.org/10.1086/703541. Author data/code: https://doi.org/10.7910/DVN/3RNFFH v1.0 (CC0). Six original forest fits use all 700 original observations; no classifier hyperparameters are adjusted. Other classifiers and full appendix are explicitly unattempted. Successful execution does not establish scientific agreement or a full-paper reproduction.

Replay: `python3 /path/to/reprorun.py /path/to/new-artifact --source source.bundle` after copying canonical files into a fresh directory and resetting image/exit_code/outputs to null. No input mount required; original data reside in the source bundle. Internet needed during build. Dockerfile contains a complete Debian recipe; some inherited utility packages are unnecessary but preserve shared VM layer caching.

provenance.json records file download URLs and original SHA256 checksums. baseline-failure.txt records the natural original failure. results/assessment.md describes measured outcomes and limitations. Date-parsing warnings are preserved, not tuned away.
