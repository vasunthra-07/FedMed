# =============================================================================
# Dockerfile  —  FedMed Production Container
# =============================================================================
# Multi-stage build:
#   Stage 1 (builder) — install Python deps into a venv
#   Stage 2 (runtime) — copy only the venv + source; no build tools
#
# This keeps the final image lean (~1.2 GB vs ~3 GB single-stage).
#
# Build:
#   docker build -t fedmed:latest .
#
# Run server:
#   docker run --rm -p 8080:8080 \
#     -e FEDMED_USE_TLS=true \
#     -v $(pwd)/certs:/app/certs \
#     -v $(pwd)/checkpoints:/app/checkpoints \
#     fedmed:latest python server.py
#
# Run client:
#   docker run --rm \
#     -e FEDMED_USE_TLS=true \
#     -v $(pwd)/certs:/app/certs \
#     fedmed:latest python client.py --id=0 --server=fedmed-server:8080
#
# Run dashboard:
#   docker run --rm -p 8501:8501 \
#     -e FEDMED_DASH_USER=admin \
#     -e FEDMED_DASH_PASS_HASH='$2b$12$...' \
#     -v $(pwd)/metrics.csv:/app/metrics.csv \
#     fedmed:latest streamlit run app.py --server.port 8501
# =============================================================================

# ── Stage 1: dependency builder ───────────────────────────────────────────────
FROM python:3.11-slim AS builder

WORKDIR /build

# System deps needed to compile wheels (removed in runtime stage)
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc g++ libffi-dev libssl-dev git \
    && rm -rf /var/lib/apt/lists/*

# Create virtualenv for clean copy to runtime stage
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Copy requirements first (Docker layer cache: only reinstall when reqs change)
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip setuptools wheel && \
    pip install --no-cache-dir -r requirements.txt

# ── Stage 2: lean runtime image ───────────────────────────────────────────────
FROM python:3.11-slim AS runtime

# Security: run as non-root user
RUN groupadd -r fedmed && useradd -r -g fedmed fedmed

WORKDIR /app

# Minimal runtime system deps
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Copy virtualenv from builder
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Copy application source
COPY --chown=fedmed:fedmed . .

# Create runtime directories with correct ownership
RUN mkdir -p certs checkpoints logs state && \
    chown -R fedmed:fedmed /app

# Switch to non-root
USER fedmed

# Expose ports
EXPOSE 8080   
# Flower gRPC server
EXPOSE 8501   
# Streamlit dashboard

# Container smoke health check; service-specific checks live in docker-compose.
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD python -c "import common, config" || exit 1

# Default: run the server
# Override with: docker run fedmed:latest python client.py --id=0
CMD ["python", "server.py"]
