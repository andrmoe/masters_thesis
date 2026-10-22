# Ensemble treatment-effect analysis (2017)

**AI-written:** This README, study extraction, repair annotations, execution harness and assessment were written by an AI agent. Original author code and data retain their provenance.

Paper: Justin Grimmer, Solomon Messing and Sean J. Westwood, [Estimating Heterogeneous Treatment Effects and the Effects of Heterogeneous Treatments with Ensemble Methods](https://doi.org/10.1017/pan.2017.15), Political Analysis 25(4), 413–434 (2017).

Original artifact: [Harvard Dataverse BQMLQW](https://doi.org/10.7910/DVN/BQMLQW), version 1.0, CC0. Membership source: [Trisovic et al. research-code study](https://github.com/atrisovic/dataverse-r-study). All 33 original downloads are embedded in source.bundle; provenance.json records exact original-format download URLs and SHA256. dataverse-metadata.json preserves deposited metadata. The Git commit is an archive snapshot made by this campaign, not a claimed author Git revision.

Scope: execute original postprocessing of all 20 supplied simulation snapshots and the two supplied empirical prediction snapshots, sequentially in one container. Full Monte Carlo regeneration and nine-model empirical ensemble refitting are explicitly unattempted. This is a repaired analysis-only execution, not a full paper reproduction. The original author README explicitly identifies these prediction and simulation snapshots as inputs to RepCode.R.

Natural faults observed: original training fails an if-condition length check on R 4 matrix class vectors; that training failure is not repaired because model fitting lies outside scope. With training excluded, original analysis fails because model.matrix receives a treatment data frame. The repair converts the same numeric columns to a matrix. Original dev.copy writes blank PDFs under headless default PDF devices; display-list recording repairs figure export. Two personal Dropbox output paths are replaced by local paths. Scope exclusions and environment changes are visible in repair.diff. No injected faults, changed targets, altered data, or optimized scientific parameters are used.

Execution uses Debian bookworm, R base, one process with native threads set to one, a 1.2-GB virtual-memory bound, and a 300-second analysis timeout. No Java, GPU or large model downloads are needed for this declared scope. Docker has internet during the build/execution. Dockerfile is portable; exact resulting image ID is recorded in reproduction.json.

Run a fresh copy of the plan (set image, exit_code and outputs to null and ensure results is empty):

```sh
python3 /path/to/reprorun.py /path/to/fresh-artifact --source /path/to/source.bundle
```

The execution runner owns exit code and output inventory. results/assessment.md describes scientific limits. Numeric exports and original stdout retain missing/nonfinite values and plotting warnings. PDFs and R session metadata provide reviewable execution evidence; no assertion of agreement with original published numbers is made. Study fields use Snelleman's schema, manually extracted with AI assistance from the publisher abstract and original replication materials; full-paper extraction and independent review remain incomplete.

Diagnostic failures are retained under diagnostics/, separate from the canonical run. An early read-only source mount prevented PDF output; this harness mistake was corrected and is explicitly not counted as an author-code fault.

Verified canonical result (AI-written):

- first_empirical_effects.csv: 1944 rows, 0 nonfinite/missing values retained
- second_empirical_effects.csv: 51840 rows, 0 nonfinite/missing values retained
- Eight nonempty PDF files, including the aggregate Rplots.pdf; all three BEGIN/END experiment markers present.
- Runner recorded exit code 0, 13 inventoried additional output files, and immutable image sha256:bf1e2d28231b5c80eeb06822da1cb0367b8636433acb8ae266854f777d758c00.
