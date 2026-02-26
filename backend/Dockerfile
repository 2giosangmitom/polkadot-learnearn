FROM python:3.13-slim

# Do not generate .pyc, make logs unbuffered
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# Install minimal build deps (many wheels available; keep small but include compiler for any source builds)
RUN apt-get update \
    && apt-get install -y --no-install-recommends build-essential gcc ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Copy only dependency manifests first to leverage Docker cache
COPY pyproject.toml uv.lock /app/

# Upgrade pip and install the `uv` CLI, then use it to install pinned dependencies from uv.lock
# Note: different `uv` releases expose slightly different CLI names. The common command is `uv install`.
RUN python -m pip install --upgrade pip setuptools wheel \
    && python -m pip install uv \
    && uv install --no-dev --system

# Copy application source
COPY . /app

# Install a production WSGI server
RUN python -m pip install --no-cache-dir gunicorn

# Expose the port the Flask app uses
EXPOSE 5402

# Use gunicorn to run the Flask WSGI app defined in server_simple.py
CMD ["gunicorn", "--bind", "0.0.0.0:5402", "server_simple:app", "--workers", "4"]
