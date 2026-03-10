"""Wallet signature challenge/verify for Polkadot-based authentication.

Flow:
1. Client requests a challenge nonce for their wallet address.
2. Client signs the nonce with their wallet extension (sr25519).
3. Client sends ``(address, nonce, signature)`` back.
4. Server verifies the signature using ``substrate-interface``'s Keypair.

The ``Keypair.verify()`` method automatically handles the ``<Bytes>``
wrapping that Polkadot.js-compatible extensions apply to ``signRaw``
payloads.
"""

from __future__ import annotations

import logging
import secrets
import time

from substrateinterface import Keypair

logger = logging.getLogger(__name__)

# In-memory nonce store: address -> (nonce, created_at)
# For production at scale, use Redis or a DB table.
_nonces: dict[str, tuple[str, float]] = {}

NONCE_TTL_SECONDS = 300  # 5 minutes


def generate_challenge(address: str) -> str:
    """Generate a time-limited challenge nonce for *address*."""
    nonce = f"Sign this message to authenticate with Polkadot LearnEarn: {secrets.token_hex(32)}"
    _nonces[address] = (nonce, time.time())
    return nonce


def verify_signature(address: str, message: str, signature: str) -> bool:
    """Verify that *signature* was produced by *address* signing *message*.

    Returns ``True`` if valid, ``False`` otherwise.
    Also consumes (invalidates) the nonce so it cannot be reused.
    """
    # Check nonce exists and hasn't expired
    stored = _nonces.pop(address, None)
    if stored is None:
        logger.warning("No challenge found for address %s", address)
        return False

    stored_nonce, created_at = stored
    if time.time() - created_at > NONCE_TTL_SECONDS:
        logger.warning("Challenge expired for address %s", address)
        return False

    if stored_nonce != message:
        logger.warning("Challenge mismatch for address %s", address)
        return False

    # Cryptographic verification
    try:
        keypair = Keypair(ss58_address=address)
        return keypair.verify(data=message, signature=signature)
    except Exception:
        logger.exception("Signature verification error for %s", address)
        return False
