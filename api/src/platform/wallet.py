"""Platform wallet utilities for on-chain token transfers.

Uses ``substrate-interface`` to sign and submit ``Balances.transfer_keep_alive``
extrinsics from the platform wallet (whose mnemonic is stored in
``PLATFORM_WALLET_SEED``).

Two primary operations:
1. **Teacher payout** — send the teacher's share after a course purchase.
2. **Student payback** — send a lesson reward when a student passes the quiz.

All public helpers have both a synchronous variant (``transfer_*``) and an
async variant (``async_transfer_*``) that delegates to ``asyncio.to_thread``
so the event loop is never blocked.
"""

from __future__ import annotations

import asyncio
import logging
import threading

from substrateinterface import Keypair, SubstrateInterface

from src.config import settings

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Lazy-initialised singletons
# ---------------------------------------------------------------------------
_keypair: Keypair | None = None
_substrate: SubstrateInterface | None = None
_lock = threading.Lock()  # protects _substrate from concurrent thread access


def get_keypair() -> Keypair:
    """Return the platform wallet keypair (created from mnemonic)."""
    global _keypair
    if _keypair is None:
        if not settings.PLATFORM_WALLET_SEED:
            raise RuntimeError(
                "PLATFORM_WALLET_SEED is not configured. "
                "Set the mnemonic in the environment."
            )
        _keypair = Keypair.create_from_mnemonic(settings.PLATFORM_WALLET_SEED)
        logger.info("Platform wallet loaded: %s", _keypair.ss58_address)
    return _keypair


def get_substrate() -> SubstrateInterface:
    """Return (and lazily create) the shared ``SubstrateInterface`` instance.

    If the cached connection appears dead (e.g. WebSocket closed), it is
    discarded and a fresh connection is established.
    """
    global _substrate
    if _substrate is not None:
        # Quick health-check: if the underlying websocket is gone, reconnect.
        try:
            _substrate.get_block_number(None)  # cheap RPC call
        except Exception:
            logger.warning("Substrate RPC connection stale — reconnecting.")
            try:
                _substrate.close()
            except Exception:
                pass
            _substrate = None

    if _substrate is None:
        logger.info("Connecting to Substrate RPC: %s", settings.SUBSTRATE_RPC_URL)
        _substrate = SubstrateInterface(url=settings.SUBSTRATE_RPC_URL)
        logger.info("Connected to chain: %s", _substrate.chain)
    return _substrate


# ---------------------------------------------------------------------------
# Transfer helpers
# ---------------------------------------------------------------------------


def transfer_tokens(recipient_ss58: str, amount_planck: int) -> str:
    """Submit a ``Balances.transfer_keep_alive`` extrinsic.

    Args:
        recipient_ss58: The SS58 address of the recipient.
        amount_planck: The amount in planck (smallest unit).

    Returns:
        The extrinsic hash (``0x``-prefixed hex string).

    Raises:
        RuntimeError: If the extrinsic submission fails.
    """
    with _lock:
        substrate = get_substrate()
        keypair = get_keypair()

        call = substrate.compose_call(
            call_module="Balances",
            call_function="transfer_keep_alive",
            call_params={
                "dest": recipient_ss58,
                "value": amount_planck,
            },
        )

        extrinsic = substrate.create_signed_extrinsic(call=call, keypair=keypair)
        receipt = substrate.submit_extrinsic(extrinsic, wait_for_inclusion=True)

        if receipt.is_success:
            tx_hash = receipt.extrinsic_hash
            logger.info(
                "Transfer successful: %d planck -> %s (tx: %s)",
                amount_planck,
                recipient_ss58,
                tx_hash,
            )
            return str(tx_hash)
        else:
            error_msg = receipt.error_message or "Unknown error"
            logger.error(
                "Transfer failed: %d planck -> %s: %s",
                amount_planck,
                recipient_ss58,
                error_msg,
            )
            raise RuntimeError(f"On-chain transfer failed: {error_msg}")


def transfer_to_teacher(teacher_ss58: str, amount_planck: int) -> str:
    """Send the teacher's share after a course purchase.

    This is a convenience wrapper around :func:`transfer_tokens`.
    """
    logger.info("Teacher payout: %d planck -> %s", amount_planck, teacher_ss58)
    return transfer_tokens(teacher_ss58, amount_planck)


def transfer_payback(student_ss58: str, amount_planck: int) -> str:
    """Send a lesson payback reward to a student.

    This is a convenience wrapper around :func:`transfer_tokens`.
    """
    logger.info("Student payback: %d planck -> %s", amount_planck, student_ss58)
    return transfer_tokens(student_ss58, amount_planck)


# ---------------------------------------------------------------------------
# Async wrappers — use these from async FastAPI handlers to avoid blocking
# the event loop.  Each delegates to the synchronous counterpart via
# ``asyncio.to_thread``.
# ---------------------------------------------------------------------------


async def async_transfer_tokens(recipient_ss58: str, amount_planck: int) -> str:
    """Async version of :func:`transfer_tokens`."""
    return await asyncio.to_thread(transfer_tokens, recipient_ss58, amount_planck)


async def async_transfer_to_teacher(teacher_ss58: str, amount_planck: int) -> str:
    """Async version of :func:`transfer_to_teacher`."""
    return await asyncio.to_thread(transfer_to_teacher, teacher_ss58, amount_planck)


async def async_transfer_payback(student_ss58: str, amount_planck: int) -> str:
    """Async version of :func:`transfer_payback`."""
    return await asyncio.to_thread(transfer_payback, student_ss58, amount_planck)
