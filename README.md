# Polkadot LearnEarn

A full-stack application built with **FastAPI** and **Next.js**.

## 🧱 Tech Stack

### Backend

- FastAPI
- SQLModel (ORM)
- PostgreSQL

### Frontend

- Next.js
- shadcn/ui
- MagicUI

## 🚀 Development Setup

### Prerequisites

Make sure you have the following installed:

- Docker
- Docker Compose
- Node.js
- `uv` (Python package manager)
- `dotenvx`

## ⚙️ Getting Started

Follow these steps to run the project locally.

### 1. Configure Environment Variables

#### Root directory

Create a `.env` file in the project root based on `.env.example`:

```bash
cp .env.example .env
```

Update the PostgreSQL credentials for local development.

#### `/api` directory

Create another `.env` file inside the `/api` directory:

```bash
cd api
cp .env.example .env
```

Update the required backend environment variables.

### 2. Start PostgreSQL with Docker

From the root directory, run:

```bash
docker compose -f compose.yml -f compose.dev.yml up postgres
```

> [!NOTE]
> You must manually create the `polkadot_learnearn` database after the container starts.

Example:

```bash
docker exec -it <postgres_container_name> psql -U <your_user>
CREATE DATABASE polkadot_learnearn;
```

### 3. Run the Backend Server

Navigate to the `/api` directory:

```bash
cd api
```

Install dependencies:

```bash
uv sync
```

Activate the virtual environment:

```bash
source .venv/bin/activate
```

Start the development server:

```bash
dotenvx run -- fastapi dev main.py
```

`dotenvx` will automatically load environment variables from your `.env` file.
