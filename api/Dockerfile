FROM python:3.13-slim

WORKDIR /app

# Needed to build pypolkadot
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential gcc

COPY . .

RUN pip install --no-cache-dir uv \
    && uv sync

EXPOSE 8000

CMD [ "bash", "-c", "source .venv/bin/activate && fastapi run main.py" ]