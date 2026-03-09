# Polkadot LearnEarn

A full-stack e-learning platform built with **FastAPI** and **Next.js**.

## 🧱 Tech Stack

### Backend

- FastAPI
- SQLModel (ORM)
- PostgreSQL

### Frontend

- Next.js 16 (App Router)
- shadcn/ui
- MagicUI
- Tailwind CSS
- Zustand (state management)
- TanStack React Query

## 🚀 Development Setup

### Prerequisites

- Docker & Docker Compose
- Node.js 24+
- Python 3.13+
- [uv](https://github.com/astral-sh/uv) (Python package manager)
- [dotenvx](https://dotenvx.com)

## ⚙️ Getting Started

### 1. Configure Environment Variables

#### Root directory

```bash
cp .env.example .env
```

Update the PostgreSQL credentials.

#### `/api` directory

```bash
cd api
cp .env.example .env
```

Update the required backend environment variables (database URL, auth secrets, API keys).

### 2. Start PostgreSQL

```bash
docker compose -f compose.yml -f compose.dev.yml up postgres
```

### 3. Run the Backend

```bash
cd api
uv sync
source .venv/bin/activate
dotenvx run -- fastapi dev main.py
```

The API will be available at `http://localhost:8000`.

### 4. Run the Frontend

```bash
cd web
npm install
npm run dev
```

The app will be available at `http://localhost:3000`.

## 📝 Available Scripts

### Frontend (`/web`)

| Command          | Description               |
| ---------------- | ------------------------- |
| `npm run dev`    | Start development server  |
| `npm run build`  | Build for production      |
| `npm run start`  | Start production server   |
| `npm run lint`   | Run ESLint                |
| `npm run format` | Format code with Prettier |

## 📂 Project Structure

```
polkadot-learnearn/
├── api/                    # FastAPI backend
│   └── src/
│       ├── auth/           # Authentication module
│       ├── course/         # Course/learning module
│       └── ai/             # AI integrations
├── web/                    # Next.js frontend
│   ├── app/                # App Router pages
│   ├── components/         # React components
│   └── lib/                # Utilities
└── compose*.yml            # Docker configuration
```
