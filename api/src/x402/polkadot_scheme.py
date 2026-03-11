"""Polkadot x402 scheme — verify and settle on-chain payments.

Implements the *post-payment proof* approach:
1. **verify**: Confirm the ``transactionHash`` exists on-chain and that a
   ``Balances.Transfer`` to the platform wallet for the required amount is
   present in the block.
2. **settle**: Calculate fee split, send teacher payout, and persist the
   ``CoursePurchase`` record.
"""

from __future__ import annotations

import logging
import uuid

from sqlmodel import select
from sqlmodel.ext.asyncio.session import AsyncSession

from src.config import settings
from src.course.blockchain import get_block_hash_from_tx, verify_payment
from src.course.models import Course, CoursePurchase, Lesson
from src.x402.types import PaymentPayload, SettleResponse

logger = logging.getLogger(__name__)


async def verify_and_settle(
    payload: PaymentPayload,
    course: Course,
    user_id: uuid.UUID,
    session: AsyncSession,
) -> SettleResponse:
    """Verify on-chain payment and persist the purchase.

    Returns a ``SettleResponse`` on success.
    Raises ``ValueError`` with a human-readable message on failure.
    """
    proof = payload.payload
    tx_hash = proof.transactionHash
    block_hash = proof.blockHash

    # Capture ORM attributes before any session operations can expire them.
    course_id = course.id
    course_price = course.price
    author_id = course.author_id

    # Step 1 — locate the block containing this transaction
    if not block_hash:
        block_hash = get_block_hash_from_tx(tx_hash)
    if not block_hash:
        raise ValueError(
            f"Transaction {tx_hash} not found in recent finalized blocks. "
            "It may not be finalized yet — please wait and retry."
        )

    # Step 2 — verify the transfer to the platform wallet
    platform_address = settings.PLATFORM_WALLET_ADDRESS
    if not platform_address:
        raise ValueError("Platform wallet address not configured.")

    min_amount = int(course_price * (10**settings.TOKEN_DECIMALS))
    try:
        verified = verify_payment(block_hash, platform_address, min_amount)
    except RuntimeError as exc:
        # pypolkadot can raise RuntimeError when it can't decode events
        # (e.g. metadata desync after a runtime upgrade).
        logger.error("Light client RuntimeError during verify_payment: %s", exc)
        raise ValueError(
            "On-chain verification temporarily unavailable due to a chain "
            "metadata issue. Please try again in a few minutes."
        ) from exc
    if verified is None:
        raise ValueError(
            f"No transfer of >= {min_amount} planck to platform wallet "
            f"{platform_address} found in block {block_hash}."
        )

    # -----------------------------------------------------------------
    # Step 3 — settlement: fee split → teacher payout → persist
    #
    # This mirrors the post-verification logic in service.create_purchase
    # but avoids the redundant on-chain re-verification.
    # -----------------------------------------------------------------

    # 3a – calculate fee split
    platform_fee = round(course_price * settings.PLATFORM_FEE_RATE, 10)

    lessons_result = await session.exec(
        select(Lesson).where(Lesson.course_id == course_id)  # type: ignore[arg-type]
    )
    lessons = list(lessons_result.all())
    total_payback_reserve = round(sum(l.payback_amount for l in lessons), 10)

    teacher_share = round(course_price - platform_fee - total_payback_reserve, 10)
    if teacher_share < 0:
        teacher_share = 0.0

    # 3b – send teacher's share on-chain (if > 0)
    teacher_payout_hash: str | None = None
    if teacher_share > 0:
        from src.auth.models import User

        user_result = await session.exec(
            select(User).where(User.id == author_id)  # type: ignore[arg-type]
        )
        author = user_result.first()
        teacher_wallet = author.wallet_address if author else None

        if teacher_wallet:
            from src.platform.wallet import async_transfer_to_teacher

            teacher_amount_planck = int(teacher_share * (10**settings.TOKEN_DECIMALS))
            try:
                teacher_payout_hash = await async_transfer_to_teacher(
                    teacher_wallet, teacher_amount_planck
                )
                logger.info(
                    "Teacher payout: %.4f PAS -> %s (tx=%s)",
                    teacher_share,
                    teacher_wallet,
                    teacher_payout_hash,
                )
            except Exception:
                logger.exception(
                    "Teacher payout FAILED: %.4f PAS (%d planck) -> %s for course=%s. "
                    "Purchase will be saved with status='pending'.",
                    teacher_share,
                    teacher_amount_planck,
                    teacher_wallet,
                    course_id,
                )
        else:
            logger.warning(
                "No wallet found for author %s; skipping teacher payout.",
                author_id,
            )

    # 3c – persist
    purchase = CoursePurchase(
        id=uuid.uuid4(),
        course_id=course_id,
        user_id=user_id,
        transaction_hash=tx_hash,
        amount=course_price,
        platform_fee_amount=platform_fee,
        payback_reserve_amount=total_payback_reserve,
        teacher_payout_amount=teacher_share,
        teacher_payout_hash=teacher_payout_hash,
        status="completed" if teacher_payout_hash else "pending",
    )
    session.add(purchase)
    await session.commit()
    await session.refresh(purchase)

    logger.info(
        "x402 settle OK: purchase=%s, tx=%s, course=%s, user=%s",
        purchase.id,
        tx_hash,
        course_id,
        user_id,
    )

    return SettleResponse(
        success=True,
        transaction=tx_hash,
        network=payload.accepted.network,
        payer=verified.get("sender"),
    )
