# Paper repair campaign

**AI-written:** This list and its screening rationale were written by Codex.

A diverse, resource-screened queue. Difficulty is an initial estimate, not a measured ranking. Original artifacts only; injected faults excluded. Execution success is separate from scientific agreement.

The seven investigated papers span two source datasets, several scientific domains, languages, and estimated repair difficulties. This is a purposive sample, not a representative benchmark. One CPU, 1.9 GiB RAM, no GPU, and limited disk require scoped workloads. Inclusion is a preliminary feasibility judgment; an agent records any download, memory, dependency, or runtime blocker. A scoped execution does not establish full-paper reproduction. No faults are introduced.

| Order | Paper | Dataset | Domain / languages | Initial difficulty |
| --- | --- | --- | --- | --- |
| 1 | [Estimating Heterogeneous Treatment Effects and the Effects of Heterogeneous Treatments with Ensemble Methods](https://doi.org/10.7910/DVN/BQMLQW) (2017) | [Trisovic](https://github.com/atrisovic/dataverse-r-study) | Causal inference / R, Java | Hard |
| 2 | [Lethal Force in Black and White: Assessing Racial Disparities in the Circumstances of Police Killings](https://doi.org/10.7910/DVN/3RNFFH) (2019) | [Trisovic](https://github.com/atrisovic/dataverse-r-study) | Social science / R | Hard |
| 3 | [How Do Observers Assess Resolve?](https://doi.org/10.7910/DVN/VSVMY7) (2021) | [Trisovic](https://github.com/atrisovic/dataverse-r-study) | Political psychology / R | Hard |
| 4 | [Generalized Synthetic Control Method: Causal Inference with Interactive Fixed Effects Models](https://doi.org/10.7910/DVN/8AKACJ) (2017) | [Trisovic](https://github.com/atrisovic/dataverse-r-study) | Statistical methods / R, C++ | Hard |
| 5 | [How Robust Standard Errors Expose Methodological Problems They Do Not Fix, and What to Do About It](https://doi.org/10.7910/DVN/26935) (2015) | [Trisovic](https://github.com/atrisovic/dataverse-r-study) | Econometrics / R | Hard |
| 6 | [Answering Regular Path Queries through Exemplars](https://github.com/idea-iitd/RQuBE) (2022) | [CompRep](https://arxiv.org/html/2504.08684v1) | Graph databases / C++ | Moderate |
| 7 | [Adaptive Time Series Anomaly Detection for Online Services via System Failure Sketching](https://github.com/OpsPAI/ADSketch) (2022) | [CompRep](https://arxiv.org/html/2504.08684v1) | Time series / Python | Moderate |

## Execution status

The website includes seven investigated papers with submitted reproduction artifacts. RQuBE could not execute the advertised algorithm because its public repository lacks the implementation. Successful scoped executions do not establish full-paper reproduction. Every canonical attempt, including failures, is retained in the viewer.

## Planned scope

1. **ensemble** — Archived R learners, native libraries and Java dependencies; an observed model-frame type failure. Scope: One supplied empirical application; exclude the full simulation grid.
2. **lethal-force** — Fragile category merges and positional column repairs precede several statistical learners. Scope: Original cleaning and a declared analysis on the 700-row supplied dataset.
3. **resolve** — Multi-stage R/Stata workflow, supplied-data handoff, factor handling and fixed eight-worker parallelism. Scope: One supplied conjoint-analysis path; one worker, no new survey collection.
4. **gsynth** — Bundled historical R/C++ package and changed estimation API; expensive bootstrap sections. Scope: One original turnout-data specification; full Monte Carlo grid outside scope.
5. **robust-se** — Hardcoded coefficient layouts and bootstrap covariance dimensions in historical scripts. Scope: Accessible Dreher–Jensen empirical example; restricted files and full bootstrap suite explicitly assessed.
6. **rqube** — Research-specific compilation and graph/query file conventions with several search variants. Scope: One bundled graph/query workload, sequential algorithms; no enlarged benchmark graphs.
7. **adsketch** — Python 3.6-era scientific dependencies and Numba/STUMPY integration. Scope: Supplied Yahoo demonstration, headless plots, one native thread.

The [static viewer](./) reads `papers.json` and the original artifact files. Repair agents write artifacts sequentially outside the website; `tools/export_artifacts.py` publishes their evidence into this directory.

## Resource exclusions

[CONFETTI](https://github.com/neu-se/CONFETTI#running) requires at least 16 GB RAM. The [GitHub Actions resource-usage study](https://github.com/sola-st/github-workflow-resource-optimization#hardware-requirements) requires at least 8 GB disk and reports analysis memory reaching 9 GB. Both were excluded before repair. Large model training, whole benchmark images, and injected-fault variants are excluded. These are workload scopes, not claims that the full papers fit this VM.
