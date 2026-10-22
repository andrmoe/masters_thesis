# How Do Observers Assess Resolve? — scoped execution

**AI-written:** This README, study extraction, repair commentary, assessment and execution harness were written by an AI agent. Original author code/data are identified in provenance.json.

Runs the original unweighted main conjoint model with all 16,180 supplied non-US profiles and 1,500 respondent-cluster bootstraps. Original dataset and model formula are unchanged. The eight-worker SOCK cluster is limited to one worker, explicitly initialized with seed 43215; the original master-only set.seed did not determine worker RNG streams, so exact historical bootstrap equality is not expected. No outcome target or tuning is used.

The reported rbind preprocessing failure follows an explicitly manual Stata entropy-balancing intermission, rather than an R defect to patch with fabricated weights. The authors allow using their supplied cleaned RData; this execution uses that path. Weighted, elite and appendix analyses are not attempted. The Figure 3 corrigendum is outside the scheduled main-model output and no labels or scientific claims are silently changed.

Portable execution: `python3 /path/to/reprorun.py /path/to/attempt-0001 --source /path/to/source.bundle`. Use a fresh copy with null execution fields and empty results for another execution; the recorded artifact must not be overwritten.

Dataverse is an archive, not an upstream Git repository. `repository.commit` identifies a locally created Git snapshot of ten original downloaded files; `source.bundle` carries that snapshot. The checksums preserve the original scripts, codebook and the single supplied cleaned dataset needed for this scope. Other archive files were not downloaded.
