# AI-written: CPU-only portable compiler environment.
FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends g++ make ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /work
COPY . /work
ENV OMP_NUM_THREADS=1 OPENBLAS_NUM_THREADS=1
