# AI-written environment for original R analyses using supplied prediction snapshots.
FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends r-base-core ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /work
COPY . /work
ENV OPENBLAS_NUM_THREADS=1 OMP_NUM_THREADS=1 MKL_NUM_THREADS=1
