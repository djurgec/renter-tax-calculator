# PorezniKompas: one image serving the web app and the API on one port.
#
# The database is not built here (the ETL needs ~390 MB of downloads and far more memory
# than a small host has). It is built by .github/workflows/data.yml and published as the
# GitHub release "data"; this image downloads it at build time and checks its SHA-256.
# Build without it (--build-arg DB_SOURCE=none) and mount data/build/ at /app/data instead,
# as the "local" service in docker-compose.yml does.

ARG DB_SOURCE=release

# ---- 1. frontend
FROM node:22-slim AS web
WORKDIR /web
COPY web/package.json web/package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY web/ ./
RUN npm run build

# ---- 2. database
FROM python:3.12-slim AS db-release
ARG DB_URL=https://github.com/djurgec/renter-tax-calculator/releases/download/data
WORKDIR /data
# A remote ADD is checked again on every build, so a new release invalidates the cached
# download below even when no code changed (e.g. a redeploy after the Data workflow).
ADD $DB_URL/porezni_kompas.sqlite.sha256 ./
RUN for f in porezni_kompas.sqlite validation_report.json; do \
      python -c "import sys, urllib.request; urllib.request.urlretrieve(sys.argv[1], sys.argv[2])" \
        "$DB_URL/$f" "$f" || exit 1; \
    done && sha256sum -c porezni_kompas.sqlite.sha256

FROM python:3.12-slim AS db-none
RUN mkdir -p /data

FROM db-${DB_SOURCE} AS db

# ---- 3. Python app
FROM python:3.12-slim AS app
COPY --from=ghcr.io/astral-sh/uv:0.13.6 /uv /usr/local/bin/uv
ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_PROJECT_ENVIRONMENT=/app/.venv \
    PYTHONUNBUFFERED=1
WORKDIR /app

# dependencies first, so code changes reuse this layer
COPY pyproject.toml uv.lock README.md ./
RUN uv sync --locked --no-dev --no-install-project
COPY src/ src/
RUN uv sync --locked --no-dev

COPY --from=web /web/dist /app/web

COPY --from=db /data /app/data

RUN useradd --system --no-create-home app
USER app

ENV PATH=/app/.venv/bin:$PATH \
    PK_HOST=0.0.0.0 \
    PK_DB_PATH=/app/data/porezni_kompas.sqlite \
    PK_WEB_DIR=/app/web \
    PK_RATE_LIMIT=300 \
    FORWARDED_ALLOW_IPS=*
EXPOSE 8000
HEALTHCHECK --interval=60s --timeout=5s --start-period=20s \
  CMD python -c "import os, urllib.request; urllib.request.urlopen('http://127.0.0.1:%s/api/health' % (os.environ.get('PK_PORT') or os.environ.get('PORT') or '8000'), timeout=4)"
CMD ["porezni-kompas-api"]
