import json
import os
from flask import Flask, request, jsonify, Response
from flask_cors import CORS
from pypolkadot import LightClient
from ai_agent import evaluate_milestone

app = Flask(__name__)
CORS(app)  # Enable CORS for frontend requests

# Network configuration - Paseo Asset Hub testnet
# pypolkadot uses "paseo" to refer to Paseo Asset Hub chain
NETWORK = os.getenv("NETWORK", "paseo")
DEFAULT_RECIPIENT = os.getenv("DEFAULT_RECIPIENT_WALLET", "1RPK4brFegTGGKHFpjZ7jxZ3jiwCMyihhMFQomyzHAJfcUV")

# Lazy-init light client
_client = None      


def get_client():
    global _client
    if _client is None:
        print(f"[INIT] Initializing light client for {NETWORK}...")

        try:
            _client = LightClient(network=NETWORK)
            print("[INIT] LightClient constructor OK")

            print("[INIT] Fetching finalized block...")
            block = _client.get_finalized_block()
            print(f"[INIT] Light client ready! Latest block: #{block.number} ({block.hash})")

        except Exception as e:
            print("[INIT][ERROR] Failed during light client init")
            print(e)
            _client = None
            raise

    return _client


def bytes_to_hex(value) -> str | None:
    """Convert various byte representations to hex string."""
    # Handle nested list like [[1, 2, 3, ...]]
    if isinstance(value, list):
        if len(value) == 1 and isinstance(value[0], list):
            value = value[0]
        if all(isinstance(b, int) for b in value):
            return "0x" + bytes(value).hex()
    # Already a hex string
    if isinstance(value, str) and (value.startswith("0x") or len(value) == 64):
        return value if value.startswith("0x") else "0x" + value
    return None


def ss58_to_hex(ss58_address: str) -> str | None:
    """Convert SS58 address to hex using the light client's storage query trick."""
    # We can use base58 decoding manually
    import base58
    try:
        decoded = base58.b58decode(ss58_address)
        # SS58 format: [prefix(1-2 bytes)][pubkey(32 bytes)][checksum(2 bytes)]
        if len(decoded) == 35:  # 1-byte prefix
            pubkey = decoded[1:33]
        elif len(decoded) == 36:  # 2-byte prefix
            pubkey = decoded[2:34]
        else:
            return None
        return "0x" + pubkey.hex()
    except Exception as e:
        print(f"[WARN] Failed to decode SS58 {ss58_address}: {e}")
        return None


def verify_payment(block_hash: str, recipient: str, min_amount: int) -> dict | None:
    """Verify a payment exists in the given block."""
    client = get_client()

    print(f"\n[VERIFY] Looking for payment in block: {block_hash}")
    print(f"[VERIFY] Expected recipient (SS58): {recipient}")

    # Convert recipient to hex for comparison
    recipient_hex = ss58_to_hex(recipient)
    print(f"[VERIFY] Expected recipient (hex): {recipient_hex}")
    print(f"[VERIFY] Minimum amount: {min_amount}")

    # Get transfer events
    transfers = client.events(block_hash=block_hash, pallet="Balances", name="Transfer")
    print(f"[VERIFY] Found {len(transfers)} Balances.Transfer events")

    for i, t in enumerate(transfers):
        print(f"\n[VERIFY] Transfer #{i}:")
        print(f"  Raw fields: {t.fields}")

        # Extract and convert fields
        to_raw = t.fields.get("to")
        from_raw = t.fields.get("from")
        amount = t.fields.get("amount", 0)

        to_hex = bytes_to_hex(to_raw)
        from_hex = bytes_to_hex(from_raw)

        print(f"  from (hex): {from_hex}")
        print(f"  to (hex): {to_hex}")
        print(f"  amount: {amount}")

        # Compare hex addresses
        match = to_hex and recipient_hex and to_hex.lower() == recipient_hex.lower()
        print(f"  Match: {to_hex} == {recipient_hex}: {match}")
        print(f"  Amount ok: {amount} >= {min_amount}: {amount >= min_amount}")

        if match and amount >= min_amount:
            print(f"[VERIFY] MATCH FOUND!")
            return {
                "from": from_hex,
                "to": to_hex,
                "to_ss58": recipient,
                "amount": amount,
                "block_hash": block_hash,
            }

    print(f"[VERIFY] No matching transfer found")
    return None


def get_block_hash_from_tx(tx_hash: str, max_blocks: int = 50) -> str | None:
    """Find block hash containing a transaction by searching recent finalized blocks.
    
    Args:
        tx_hash: The transaction/extrinsic hash to search for
        max_blocks: Maximum number of recent blocks to search (default: 50)
    
    Returns:
        Block hash if found, None otherwise
    """
    client = get_client()
    
    # Normalize tx_hash
    if not tx_hash.startswith("0x"):
        tx_hash = "0x" + tx_hash
    tx_hash = tx_hash.lower()
    
    print(f"\n[TX->BLOCK] Searching for transaction: {tx_hash}")
    print(f"[TX->BLOCK] Searching up to {max_blocks} recent blocks...")
    
    # Get current finalized block
    current_block = client.get_finalized_block()
    current_number = current_block.number
    
    print(f"[TX->BLOCK] Current finalized block: #{current_number}")
    
    # Search backwards through recent blocks
    for i in range(max_blocks):
        block_number = current_number - i
        if block_number < 0:
            break
            
        try:
            # Get block by number
            block = client.get_block(block_number=block_number)
            block_hash = block.hash
            
            # Get all extrinsics in this block
            extrinsics = block.extrinsics if hasattr(block, 'extrinsics') else []
            
            for ext in extrinsics:
                ext_hash = None
                if hasattr(ext, 'hash'):
                    ext_hash = ext.hash
                elif hasattr(ext, 'extrinsic_hash'):
                    ext_hash = ext.extrinsic_hash
                    
                if ext_hash:
                    # Normalize for comparison
                    if not str(ext_hash).startswith("0x"):
                        ext_hash = "0x" + str(ext_hash)
                    ext_hash = str(ext_hash).lower()
                    
                    if ext_hash == tx_hash:
                        print(f"[TX->BLOCK] FOUND! Transaction in block #{block_number} ({block_hash})")
                        return block_hash
                        
        except Exception as e:
            print(f"[TX->BLOCK] Error checking block #{block_number}: {e}")
            continue
    
    print(f"[TX->BLOCK] Transaction not found in last {max_blocks} blocks")
    return None


def get_block_hash_from_tx_via_events(tx_hash: str, max_blocks: int = 30) -> str | None:
    """Alternative method: Search for tx in recent blocks by checking System.ExtrinsicSuccess events."""
    client = get_client()
    
    # Normalize tx_hash
    if not tx_hash.startswith("0x"):
        tx_hash = "0x" + tx_hash
    tx_hash = tx_hash.lower()
    
    print(f"\n[TX->BLOCK v2] Searching for transaction: {tx_hash}")
    
    # Get current finalized block
    current_block = client.get_finalized_block()
    current_number = current_block.number
    current_hash = current_block.hash
    
    print(f"[TX->BLOCK v2] Starting from block #{current_number} ({current_hash})")
    
    # Search recent blocks
    for i in range(max_blocks):
        block_number = current_number - i
        if block_number < 0:
            break
        
        try:
            block = client.get_block(block_number=block_number)
            block_hash = block.hash
            
            # Check extrinsics in block
            if hasattr(block, 'extrinsics'):
                for idx, ext in enumerate(block.extrinsics):
                    # Try to get extrinsic hash
                    ext_hash = getattr(ext, 'hash', None) or getattr(ext, 'extrinsic_hash', None)
                    if ext_hash:
                        ext_hash_str = str(ext_hash).lower()
                        if not ext_hash_str.startswith("0x"):
                            ext_hash_str = "0x" + ext_hash_str
                        
                        if ext_hash_str == tx_hash:
                            print(f"[TX->BLOCK v2] FOUND! Block #{block_number} ({block_hash})")
                            return block_hash
                            
        except Exception as e:
            print(f"[TX->BLOCK v2] Error at block #{block_number}: {e}")
            continue
    
    print(f"[TX->BLOCK v2] Not found in {max_blocks} blocks")
    return None


@app.route("/evaluate", methods=["POST"])
def evaluate_answer():
    """Evaluate a student's answer for a milestone."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "JSON body required"}), 400
            
        milestone = data.get("milestone")
        answer = data.get("answer")
        
        if not milestone or not answer:
            return jsonify({"error": "milestone and answer are required"}), 400
            
        print(f"[EVALUATE] Milestone: {milestone.get('question')[:30]}...")
        print(f"[EVALUATE] Answer: {answer[:30]}...")
        
        if not milestone.get('question') or not milestone.get('expectedCriteria'):
            # Fallback for old milestone format or missing fields
             return jsonify({
                 "pass": True,
                 "feedback": "Auto-passed due to missing milestone criteria."
             })

        result = evaluate_milestone(milestone, answer)
        print(f"[EVALUATE] Result: {result}")
        
        return jsonify(result)
        
    except Exception as e:
        print(f"[EVALUATE] Error: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/verify", methods=["POST"])
def verify_payment_endpoint():
    """API endpoint to verify payment on-chain.
    
    Expected JSON body:
    {
        "transactionHash": "0x...",  // preferred - will query for blockHash
        "blockHash": "0x...",        // optional - direct block hash (backward compatible)
        "recipient": "SS58_ADDRESS",  
        "amount": 1000000000  // in planck
    }
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "JSON body required"}), 400
        
        tx_hash = data.get("transactionHash")
        block_hash = data.get("blockHash")
        recipient = data.get("recipient")
        amount = data.get("amount", 0)
        
        if not tx_hash and not block_hash:
            return jsonify({"error": "transactionHash or blockHash is required"}), 400
        if not recipient:
            return jsonify({"error": "recipient is required"}), 400
        
        # If transactionHash provided, query for blockHash
        if tx_hash and not block_hash:
            print(f"\n[VERIFY API] Looking up block for tx: {tx_hash}")
            block_hash = get_block_hash_from_tx(tx_hash)
            if not block_hash:
                # Try alternative method
                block_hash = get_block_hash_from_tx_via_events(tx_hash)
            
            if not block_hash:
                return jsonify({
                    "verified": False,
                    "error": f"Transaction {tx_hash} not found in recent blocks. It may not be finalized yet - please wait and retry."
                }), 404
        
        print(f"\n[VERIFY API] Request: tx={tx_hash}, block={block_hash}, recipient={recipient}, amount={amount}")
        
        payment = verify_payment(block_hash, recipient, amount)
        
        if payment:
            payment["transactionHash"] = tx_hash  # Include tx hash in response
            return jsonify({
                "verified": True,
                "payment": payment
            })
        else:
            return jsonify({
                "verified": False,
                "error": f"No transfer of >= {amount} to {recipient} in block {block_hash}"
            })
            
    except Exception as e:
        print(f"[VERIFY API] Error: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/payment-info/<course_id>", methods=["GET"])
def get_payment_info(course_id: str):
    """Get payment info for a specific course.
    
    Query params:
    - recipient: Teacher's wallet address (SS58)
    - amount: Course cost in planck
    - title: Course title (optional)
    """
    recipient = request.args.get("recipient", DEFAULT_RECIPIENT)
    amount = request.args.get("amount", type=int, default=0)
    title = request.args.get("title", f"Course {course_id}")
    
    return jsonify({
        "courseId": course_id,
        "courseTitle": title,
        "payment": {
            "network": "paseo",
            "recipient": recipient,
            "recipientHex": ss58_to_hex(recipient),
            "amount": amount,
            "currency": "PAS",
            "instructions": "Sign and submit transfer to recipient, then call /verify or /enroll with transactionHash"
        }
    })


@app.route("/enroll/<course_id>", methods=["POST"])
def enroll_course(course_id: str):
    """Enroll in a course using smol402 payment flow.
    
    First call (no paymentProof): Returns 402 Payment Required
    Second call (with paymentProof): Verifies payment and enrolls user
    
    Expected JSON body:
    {
        "walletAddress": "SS58_ADDRESS",
        "courseCost": 1000000000,  // in planck
        "paymentProof": {          // optional - include after payment
            "transactionHash": "0x...",  // preferred - server will query blockHash
            "blockHash": "0x..."         // optional - backward compatible
        }
    }
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "JSON body required"}), 400
        
        wallet_address = data.get("walletAddress")
        course_cost = data.get("courseCost", 0)
        payment_proof = data.get("paymentProof")
        
        if not wallet_address:
            return jsonify({"error": "walletAddress is required"}), 400
        
        print(f"\n[ENROLL] Course: {course_id}, Wallet: {wallet_address}, Cost: {course_cost}")
        print(f"[ENROLL] Payment proof: {payment_proof}")
        
        # If no payment proof provided, return 402 Payment Required
        if not payment_proof:
            print(f"[ENROLL] No payment proof - returning 402 Payment Required")
            return Response(
                json.dumps({
                    "error": "Payment Required",
                    "courseId": course_id,
                    "payment": {
                        "network": "paseo",
                        "recipient": DEFAULT_RECIPIENT,
                        "recipientHex": ss58_to_hex(DEFAULT_RECIPIENT),
                        "amount": course_cost,
                        "currency": "PAS",
                        "instructions": "Sign and submit transfer to recipient, then retry with paymentProof.transactionHash"
                    }
                }, indent=2),
                status=402,
                mimetype="application/json",
                headers={
                    "X-Payment-Required": f"recipient={DEFAULT_RECIPIENT};amount={course_cost}",
                    "Access-Control-Expose-Headers": "X-Payment-Required"
                }
            )
        
        # Payment proof provided - get transactionHash or blockHash
        tx_hash = payment_proof.get("transactionHash")
        block_hash = payment_proof.get("blockHash")
        
        if not tx_hash and not block_hash:
            return jsonify({"error": "paymentProof.transactionHash or paymentProof.blockHash is required"}), 400
        
        # Prefer blockHash if provided (faster, no need to search)
        # Only query for blockHash if only transactionHash is provided
        if tx_hash and not block_hash:
            print(f"[ENROLL] Looking up block for transaction: {tx_hash}")
            block_hash = get_block_hash_from_tx(tx_hash)
            if not block_hash:
                # Try alternative method
                block_hash = get_block_hash_from_tx_via_events(tx_hash)
            
            if not block_hash:
                return jsonify({
                    "error": "Transaction not found",
                    "details": f"Transaction {tx_hash} not found in recent finalized blocks. Please wait for finalization and retry.",
                    "hint": "Transaction may still be pending or not yet finalized. Try again in ~12 seconds."
                }), 404
        else:
            print(f"[ENROLL] Using provided blockHash: {block_hash}")
        
        print(f"[ENROLL] Verifying payment in block: {block_hash}")
        
        # Verify payment on-chain
        payment = verify_payment(block_hash, DEFAULT_RECIPIENT, course_cost)
        
        if not payment:
            return jsonify({
                "error": "Payment verification failed",
                "details": f"No transfer of >= {course_cost} planck to {DEFAULT_RECIPIENT} in block {block_hash}"
            }), 402
        
        print(f"[ENROLL] Payment verified! Enrolling user...")
        
        # Include transaction hash in response
        payment["transactionHash"] = tx_hash
        
        # Payment verified - return success (actual enrollment logic would go here)
        return jsonify({
            "success": True,
            "courseId": course_id,
            "walletAddress": wallet_address,
            "payment": payment,
            "message": f"Successfully enrolled in course {course_id}"
        })
        
    except Exception as e:
        print(f"[ENROLL] Error: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/premium")
def premium_content():
    """Protected endpoint requiring x402 payment.
    
    Query params (for dynamic pricing):
    - recipient: Override default recipient wallet
    - amount: Required payment amount in planck
    """
    # Get dynamic payment params or use defaults
    recipient = request.args.get("recipient", DEFAULT_RECIPIENT)
    price_planck = request.args.get("amount", type=int, default=1_000_000_000)

    payment_header = request.headers.get("X-Payment")
    print(f"\n[REQUEST] /premium - X-Payment header: {payment_header}")
    print(f"[REQUEST] recipient={recipient}, amount={price_planck}")

    if not payment_header:
        print(f"[REQUEST] No payment header, returning 402")
        return Response(
            json.dumps({
                "error": "Payment Required",
                "payment": {
                    "network": "paseo",
                    "recipient": recipient,
                    "amount": price_planck,
                    "currency": "PAS",
                    "instructions": "Sign and submit transfer to recipient, then retry with X-Payment: tx=0x... or block=0x..."
                }
            }, indent=2),
            status=402,
            mimetype="application/json",
            headers={"X-Payment-Required": f"recipient={recipient};amount={price_planck}"}
        )

    # Parse payment proof - support both tx= and block=
    block_hash = None
    tx_hash = None
    
    try:
        if "tx=" in payment_header:
            tx_hash = payment_header.split("tx=")[1].split(";")[0].strip()
            print(f"[REQUEST] Parsed tx hash: {tx_hash}")
            # Query block hash from tx hash
            block_hash = get_block_hash_from_tx(tx_hash)
            if not block_hash:
                block_hash = get_block_hash_from_tx_via_events(tx_hash)
            if not block_hash:
                return jsonify({
                    "error": "Transaction not found",
                    "details": f"Transaction {tx_hash} not found in recent blocks"
                }), 404
        elif "block=" in payment_header:
            block_hash = payment_header.split("block=")[1].split(";")[0].strip()
            print(f"[REQUEST] Parsed block hash: {block_hash}")
        else:
            raise ValueError("No tx= or block= found in header")
    except (IndexError, AttributeError, ValueError) as e:
        print(f"[REQUEST] Failed to parse header: {e}")
        return jsonify({"error": "Invalid X-Payment header format. Use: tx=0x... or block=0x..."}), 400

    # Verify payment on-chain
    payment = verify_payment(block_hash, recipient, price_planck)

    if not payment:
        return jsonify({
            "error": "Payment not found",
            "details": f"No transfer of >= {price_planck} to {recipient} in block {block_hash}",
        }), 402

    print(f"[REQUEST] Payment verified!")
    return jsonify({
        "content": "This is the premium content you paid for!",
        "payment_verified": payment,
    })


@app.route("/health")
def health():
    """Health check."""
    client = get_client()
    block = client.get_finalized_block()
    return jsonify({
        "status": "ok",
        "network": NETWORK,
        "latest_block": block.number,
        "default_recipient": DEFAULT_RECIPIENT,
        "default_recipient_hex": ss58_to_hex(DEFAULT_RECIPIENT),
    })


@app.route("/tx-to-block/<tx_hash>", methods=["GET"])
def tx_to_block(tx_hash: str):
    """Query block hash from transaction hash.
    
    Useful for finding which block contains a specific transaction.
    """
    print(f"\n[TX-TO-BLOCK] Looking up block for tx: {tx_hash}")
    
    block_hash = get_block_hash_from_tx(tx_hash)
    if not block_hash:
        block_hash = get_block_hash_from_tx_via_events(tx_hash)
    
    if block_hash:
        return jsonify({
            "found": True,
            "transactionHash": tx_hash,
            "blockHash": block_hash
        })
    else:
        return jsonify({
            "found": False,
            "transactionHash": tx_hash,
            "error": "Transaction not found in recent finalized blocks",
            "hint": "Transaction may still be pending or not yet finalized"
        }), 404


@app.route("/debug/<block_hash>")
def debug_block(block_hash):
    """Debug endpoint to inspect a block's events."""
    client = get_client()

    all_events = client.events(block_hash=block_hash)

    events_list = []
    for e in all_events:
        fields = dict(e.fields) if isinstance(e.fields, dict) else e.fields
        # Convert any byte arrays in fields
        if isinstance(fields, dict):
            for k, v in fields.items():
                hex_val = bytes_to_hex(v)
                if hex_val:
                    fields[k] = hex_val
        events_list.append({
            "index": e.index,
            "pallet": e.pallet,
            "name": e.name,
            "fields": fields,
        })

    return jsonify({
        "block_hash": block_hash,
        "total_events": len(all_events),
        "events": events_list,
    })


if __name__ == "__main__":
    print(f"[START] smol402 Payment Server")
    print(f"[START] Network: {NETWORK}")
    print(f"[START] Default Recipient: {DEFAULT_RECIPIENT}")
    print(f"[START] Default Recipient (hex): {ss58_to_hex(DEFAULT_RECIPIENT)}")
    print(f"[START] Endpoints:")
    print(f"         POST /enroll/<course_id> - Enroll with smol402 payment (transactionHash supported)")
    print(f"         POST /verify - Verify payment on-chain (transactionHash or blockHash)")
    print(f"         GET  /tx-to-block/<tx_hash> - Query block hash from transaction hash")
    print(f"         GET  /payment-info/<course_id> - Get payment info for course")
    print(f"         GET  /premium - x402 protected endpoint (dynamic params)")
    print(f"         GET  /health - Health check")
    print(f"         GET  /debug/<block_hash> - Debug block events")
    app.run(port=5402, debug=True)
