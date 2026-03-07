"""On-chain payment verification via pypolkadot light client.

Provides helpers to locate a transaction in recent finalized blocks and
verify that a ``Balances.Transfer`` event with the expected recipient and
minimum amount exists in the same block.
"""

from __future__ import annotations

import base58
import logging
from typing import TypedDict

from pypolkadot import LightClient

from src.config import settings

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Lazy-initialised light client singleton
# ---------------------------------------------------------------------------
_client: LightClient | None = None


def get_client() -> LightClient:
    """Return (and lazily create) the shared ``LightClient`` instance."""
    global _client
    if _client is None:
        logger.info("Initializing light client for network=%s", settings.NETWORK)
        _client = LightClient(network=settings.NETWORK)
        block = _client.get_finalized_block()
        logger.info(
            "Light client ready – latest finalized block #%s (%s)",
            block.number,
            block.hash,
        )
    return _client


# ---------------------------------------------------------------------------
# Byte / address helpers (ported from reference implementation)
# ---------------------------------------------------------------------------


def bytes_to_hex(value: object) -> str | None:
    """Convert various byte representations to a ``0x``-prefixed hex string."""
    if isinstance(value, list):
        # Handle nested list like [[1, 2, 3, ...]]
        if len(value) == 1 and isinstance(value[0], list):
            value = value[0]
        if all(isinstance(b, int) for b in value):
            return "0x" + bytes(value).hex()
    if isinstance(value, str) and (value.startswith("0x") or len(value) == 64):
        return value if value.startswith("0x") else "0x" + value
    return None


def ss58_to_hex(ss58_address: str) -> str | None:
    """Decode an SS58 address to its 32-byte public key hex."""
    try:
        decoded = base58.b58decode(ss58_address)
        if len(decoded) == 35:  # 1-byte prefix
            pubkey = decoded[1:33]
        elif len(decoded) == 36:  # 2-byte prefix
            pubkey = decoded[2:34]
        else:
            return None
        return "0x" + pubkey.hex()
    except Exception:
        logger.warning("Failed to decode SS58 address %s", ss58_address)
        return None


# ---------------------------------------------------------------------------
# Transaction → block lookup
# ---------------------------------------------------------------------------


def get_block_hash_from_tx(
    tx_hash: str, *, max_blocks: int | None = None
) -> str | None:
    """Search recent finalized blocks for a transaction hash.

    Returns the block hash if found, ``None`` otherwise.
    """
    client = get_client()
    if max_blocks is None:
        max_blocks = settings.TX_SEARCH_MAX_BLOCKS

    if not tx_hash.startswith("0x"):
        tx_hash = "0x" + tx_hash
    tx_hash = tx_hash.lower()

    current_block = client.get_finalized_block()
    current_number: int = current_block.number
    logger.info(
        "Searching for tx %s in last %d blocks (head=#%d)",
        tx_hash,
        max_blocks,
        current_number,
    )

    for i in range(max_blocks):
        block_number = current_number - i
        if block_number < 0:
            break
        try:
            block = client.get_block(block_number=block_number)  # type: ignore[attr-defined]
            block_hash = block.hash
            extrinsics = block.extrinsics if hasattr(block, "extrinsics") else []
            for ext in extrinsics:
                ext_hash = getattr(ext, "hash", None) or getattr(
                    ext, "extrinsic_hash", None
                )
                if ext_hash:
                    ext_hash_str = str(ext_hash).lower()
                    if not ext_hash_str.startswith("0x"):
                        ext_hash_str = "0x" + ext_hash_str
                    if ext_hash_str == tx_hash:
                        logger.info(
                            "Found tx in block #%d (%s)", block_number, block_hash
                        )
                        return str(block_hash)
        except Exception:
            logger.debug("Error checking block #%d", block_number, exc_info=True)
            continue

    logger.info("Transaction %s not found in last %d blocks", tx_hash, max_blocks)
    return None


# ---------------------------------------------------------------------------
# Payment verification
# ---------------------------------------------------------------------------


class VerifiedPayment(TypedDict):
    sender: str
    recipient: str
    recipient_ss58: str
    amount: int
    block_hash: str


def verify_payment(
    block_hash: str, recipient_ss58: str, min_amount: int
) -> VerifiedPayment | None:
    """Check ``Balances.Transfer`` events in *block_hash* for a matching payment.

    Returns payment details if a transfer to *recipient_ss58* with at least
    *min_amount* planck is found, ``None`` otherwise.
    """
    client = get_client()
    recipient_hex = ss58_to_hex(recipient_ss58)
    if recipient_hex is None:
        logger.error("Could not decode recipient SS58 address: %s", recipient_ss58)
        return None

    transfers = client.events(block_hash=block_hash, pallet="Balances", name="Transfer")
    logger.info(
        "Found %d Balances.Transfer events in block %s", len(transfers), block_hash
    )

    for t in transfers:
        to_hex = bytes_to_hex(t.fields.get("to"))
        from_hex = bytes_to_hex(t.fields.get("from"))
        amount: int = t.fields.get("amount", 0)

        if to_hex and to_hex.lower() == recipient_hex.lower() and amount >= min_amount:
            logger.info(
                "Payment verified: %s -> %s, amount=%d", from_hex, to_hex, amount
            )
            return VerifiedPayment(
                sender=from_hex or "",
                recipient=to_hex,
                recipient_ss58=recipient_ss58,
                amount=amount,
                block_hash=block_hash,
            )

    logger.info("No matching transfer found in block %s", block_hash)
    return None
