# AI-written; full portable recipe, no pre-existing local image required.
FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends g++ make ca-certificates && rm -rf /var/lib/apt/lists/*
WORKDIR /source
RUN apt-get update && apt-get install -y --no-install-recommends python3 python3-pil poppler-utils && rm -rf /var/lib/apt/lists/*
RUN apt-get update && apt-get install -y --no-install-recommends r-base-core r-cran-dplyr r-cran-lubridate r-cran-stringr r-cran-data.table time && rm -rf /var/lib/apt/lists/*
RUN Rscript -e "install.packages('splitstackshape', repos='https://cloud.r-project.org')"
RUN apt-get update && apt-get install -y --no-install-recommends r-cran-randomforest && rm -rf /var/lib/apt/lists/*
ENV OMP_NUM_THREADS=1 OPENBLAS_NUM_THREADS=1 MKL_NUM_THREADS=1
WORKDIR /work
COPY . /work
