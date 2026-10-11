# ─── Base Image ─────────────────────────────────────────────
# Python 3.13-slim is stable, small, and has pre-built wheels
# for all our dependencies. Using 3.14 in Docker is possible
# but some packages still lack wheels — 3.13 is safer here.
FROM python:3.13-slim


# ─── Environment ────────────────────────────────────────────
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1


# ─── System Dependencies ────────────────────────────────────
# curl is used by the healthcheck; build-essential is required
# for any package that needs compiling (fallback).
RUN apt-get update && apt-get install -y --no-install-recommends \
        curl \
        build-essential \
    && rm -rf /var/lib/apt/lists/*


# ─── Working Directory ──────────────────────────────────────
WORKDIR /app


# ─── Install Python Dependencies ────────────────────────────
# Copy requirements first so Docker caches this layer when
# only the application code changes.
COPY requirements.txt .
RUN pip install --upgrade pip && pip install -r requirements.txt


# ─── Copy Application Code ──────────────────────────────────
COPY . .


# ─── Expose Port ────────────────────────────────────────────
EXPOSE 8000


# ─── Healthcheck ────────────────────────────────────────────
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1


# ─── Run ────────────────────────────────────────────────────
CMD ["uvicorn", "api.main:app", "--host", "0.0.0.0", "--port", "8000"]