# Polkadot LearnEarn

**Polkadot LearnEarn** is a fullstack e-learning platform with blockchain-based payment management. It implements the x402 protocol on Polkadot, enabling creators to monetize their courses and learners to pay using crypto.

## About x402

[x402](https://docs.x402.org) is an open protocol for HTTP payments that enables server-to-server and server-to-client payments using blockchain-native assets. It extends HTTP with standard headers for payment negotiation and proof verification.

### How x402 Works

1. **Payment Required (402 Response)**: When a user requests a protected resource without payment, the server responds with HTTP 402 and includes a `PAYMENT-REQUIRED` header containing payment requirements (amount, network, asset, recipient).

2. **Client Payment**: The client (wallet/frontend) initiates an on-chain transaction to pay the required amount.

3. **Payment Proof**: After the transaction is confirmed, the client retries the request with a `PAYMENT-SIGNATURE` header containing proof of payment (transaction hash).

4. **Verification & Settlement**: The server verifies the on-chain payment, settles the transaction (splits fees, pays the creator), and grants access with a `PAYMENT-RESPONSE` header.

### x402 Implementation on Polkadot

This project implements x402 V2 with Polkadot-specific adaptations:

| Component          | Implementation                                     |
| ------------------ | -------------------------------------------------- |
| **Network**        | Polkadot (CAIP-2: `polkadot:paseo` for testnet)    |
| **Asset**          | PAS (Paseo testnet native token)                   |
| **Payment Scheme** | Exact amount (client pays exact price)             |
| **Proof Type**     | Post-payment proof (transaction hash + block hash) |
| **Verification**   | On-chain lookup of `Balances.Transfer` events      |

### x402 Flow in This Project

```
User requests lesson → Server returns 402 + PAYMENT-REQUIRED
    ↓
Frontend shows payment dialog with course price & wallet address
    ↓
User signs transaction in Polkadot wallet
    ↓
Frontend retries request with PAYMENT-SIGNATURE (tx hash)
    ↓
Server verifies on-chain payment via Polkadot RPC
    ↓
Server settles: records purchase, splits fees, pays creator
    ↓
Server grants access + returns PAYMENT-RESPONSE
```

### Key Files

| File                                     | Purpose                                                                   |
| ---------------------------------------- | ------------------------------------------------------------------------- |
| `api/src/x402/types.py`                  | x402 V2 Pydantic models (PaymentRequired, PaymentPayload, SettleResponse) |
| `api/src/x402/middleware.py`             | FastAPI middleware: exception handler + payment verification              |
| `api/src/x402/polkadot_scheme.py`        | On-chain payment verification and settlement logic                        |
| `web/lib/x402.ts`                        | Frontend x402 payment agent                                               |
| `web/lib/api.ts`                         | API client with x402 402 handling                                         |
| `web/components/x402-payment-dialog.tsx` | Payment UI dialog                                                         |

## Features

- **Course Management** - Browse and enroll in courses with lessons and activities
- **Blockchain Payments** - x402 protocol implementation for secure, decentralized payments on Polkadot
- **Polkadot Wallet Integration** - Connect using Polkadot wallet for authentication and payments
- **AI-Powered Features** - Gemini AI integration for enhanced learning experiences

## Tech Stack

### Backend

- **FastAPI** - Modern Python web framework
- **PostgreSQL** - Primary database
- **SQLModel** - ORM for Python
- **PyJWT** - JWT authentication
- **Google Gemini** - AI integration

### Frontend

- **Next.js** - React framework with App Router
- **Tailwind CSS** - Styling
- **shadcn/ui** - Component library
- **Zustand** - State management
- **Polkadot API** - Blockchain interaction
- **Tiptap** - Rich text editor

## Getting Started

### Prerequisites

- Python 3.13+
- Node.js 22+
- PostgreSQL
- Docker (optional)

### Environment Variables

Create `.env` files based on `.env.example`:

```bash
# API (.env)
DATABASE_URL=postgresql://user:pass@localhost:5432/db
JWT_SECRET=your-secret-key
GEMINI_API_KEY=your-gemini-key
POLKADOT_WS_ENDPOINT=wss://rpc.polkadot.io
# ...

# Web (.env)
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_ENDPOINT=wss://rpc.polkadot.io
```

### Running with Docker

```bash
# Start all services
docker-compose up -d
```

### Running Locally

#### Backend

```bash
cd api
uv sync
uv run fastapi dev
```

#### Frontend

```bash
cd web
npm install
npm run dev
```

The frontend runs on `http://localhost:3000` and the API on `http://localhost:8000`.

## Project Structure

```
polkadot-learnearn/
├── api/                    # FastAPI backend
│   └── src/
│       ├── auth/           # Authentication (JWT, Polkadot signatures)
│       ├── ai/             # Gemini AI integration
│       └── x402/           # x402 protocol implementation
├── web/                    # Next.js frontend
│   └── app/
│       ├── courses/       # Course pages
│       ├── dashboard/     # User dashboard
│       └── onboarding/    # Onboarding flow
└── compose.yml            # Docker orchestration
```
