"""x402 V2 protocol types for Polkadot.

Pydantic models matching the x402 V2 specification:
https://docs.x402.org/api-reference/types

Adapted for Polkadot's post-payment proof approach:
- Network uses CAIP-2 format: ``polkadot:paseo``
- Asset is ``PAS`` (Paseo testnet native token)
- Payload carries ``transactionHash`` + ``blockHash`` as proof of payment
"""

from __future__ import annotations

from pydantic import BaseModel


# ---------------------------------------------------------------------------
# Server → Client (402 response, PAYMENT-REQUIRED header)
# ---------------------------------------------------------------------------


class ResourceInfo(BaseModel):
    """Describes the resource being paid for."""

    url: str
    description: str | None = None
    mimeType: str | None = None


class PaymentRequirements(BaseModel):
    """A single payment option the server accepts.

    For Polkadot we use:
    - scheme: "exact"  (client pays the exact amount)
    - network: "polkadot:paseo"  (CAIP-2)
    - asset: "PAS"
    - extra: {courseId, courseTitle} for UI context
    """

    scheme: str  # "exact"
    network: str  # "polkadot:paseo"
    maxAmountRequired: str  # amount in smallest unit (planck) as string
    asset: str  # "PAS"
    payTo: str  # SS58 platform wallet address
    maxTimeoutSeconds: int = 300
    extra: dict | None = None


class PaymentRequired(BaseModel):
    """Top-level 402 payload (Base64-encoded in PAYMENT-REQUIRED header)."""

    x402Version: int = 2
    resource: ResourceInfo
    accepts: list[PaymentRequirements]


# ---------------------------------------------------------------------------
# Client → Server (retry request, PAYMENT-SIGNATURE header)
# ---------------------------------------------------------------------------


class PolkadotPaymentProof(BaseModel):
    """On-chain proof: the client already sent the transaction."""

    transactionHash: str
    blockHash: str | None = None  # optional; server can look it up


class PaymentPayload(BaseModel):
    """Sent by the client in the PAYMENT-SIGNATURE header (Base64-encoded)."""

    x402Version: int = 2
    accepted: PaymentRequirements  # which option the client chose
    payload: PolkadotPaymentProof


# ---------------------------------------------------------------------------
# Server → Client (success, PAYMENT-RESPONSE header)
# ---------------------------------------------------------------------------


class SettleResponse(BaseModel):
    """Settlement result returned in the PAYMENT-RESPONSE header."""

    success: bool
    transaction: str  # the verified transaction hash
    network: str  # "polkadot:paseo"
    payer: str | None = None  # sender SS58 / hex, if known
