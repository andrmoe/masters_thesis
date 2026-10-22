FROM python:3.10-slim-bookworm
ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1 NUMBA_NUM_THREADS=1 OMP_NUM_THREADS=1 OPENBLAS_NUM_THREADS=1 MKL_NUM_THREADS=1 MPLBACKEND=Agg
RUN pip install --no-cache-dir numpy==1.24.4 scipy==1.10.1 scikit-learn==1.3.2 pandas==1.5.3 matplotlib==3.7.5 networkx==2.8.8 numba==0.58.1 stumpy==1.12.0 tqdm==4.66.2
WORKDIR /work
COPY . /work
