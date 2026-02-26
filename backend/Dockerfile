FROM python:3.13-slim

WORKDIR /app

# Needed to build pypolkadot
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential gcc ca-certificates \
    && rm -rf /var/lib/apt/lists/*

# Copy only dependency files first
COPY pyproject.toml uv.lock ./

RUN pip install --no-cache-dir uv \
    && uv sync

# Now copy the rest
COPY ai_agent.py server_simple.py ./

EXPOSE 5402

CMD ["bash", "-c", "source .venv/bin/activate && gunicorn --bind 0.0.0.0:5402 server_simple:app"]
