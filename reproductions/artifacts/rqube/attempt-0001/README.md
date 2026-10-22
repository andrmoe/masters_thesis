# RQuBE compilation diagnostic

**AI-written:** This document and the added execution harness were written by the repair agent. Original algorithm source remains author-written.

Pinned original source is preserved in source.bundle; repair.diff adds only reproduce.sh. Dockerfile installs a CPU compiler. Run with `sg docker -c 'python3 /home/agent/masters_thesis/reprorun.py ATTEMPT --source ATTEMPT/source.bundle'`.

The original public repository omits both README-advertised RQuBE main implementations and parameter-experiment drivers. Available code is BBFS ground-truth generation. The diagnostic compiles those original files sequentially; no published query workload is claimed. The author supplies graph files externally on Google Drive: coauthor edges100M, citation122M, stackoverflow153M, freebase844M. Exact Drive warning responses are retained as evidence. No graph subset or synthetic replacement was manufactured. No benchmark output, paper agreement, speedup, accuracy, or full reproduction is claimed.

Outcomes are observations, not optimization targets. There is no target result for this compilation diagnostic.

Observed container exit: **66**. Both original BBFS edge and node programs compiled successfully. stderr explicitly records missing main implementations. This is an incomplete scientific reproduction with a successful compilation diagnostic. `unattempted_experiments` records the omitted graph/query workload. No active container remains.
