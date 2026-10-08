FROM python:3.11-slim
WORKDIR /work
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
CMD ["python", "analysis_optimization.py", "-m", "MBV2-w0.35", "-p", "P1", "-c1", "inf"]
