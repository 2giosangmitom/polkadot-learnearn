import { NextRequest, NextResponse } from "next/server";
import { Contract, JsonRpcProvider, Wallet } from "ethers";
import { POOL_COURSE_FACTORY_ABI } from "../constant";

const FACTORY_ADDRESS =  "0x62Bdb9A8Fed36e22272CA96661eB3F600e8f8F13";
const RPC_URL = "https://services.polkadothub-rpc.com/testnet"
const ADMIN_PRIVATE_KEY = process.env.ADMIN_PRIVATE_KEY; 

/**
 * POST /api/pool/deploy
 * 
 * Deploy a new PoolCourse contract via the factory using admin wallet
 * 
 * Request body:
 * {
 *   "courseName": "My Course Name"
 * }
 * 
 * Response:
 * {
 *   "success": true,
 *   "poolAddress": "0x...",
 *   "transactionHash": "0x...",
 *   "courseName": "My Course Name"
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { courseName } = body;

    // Validate input
    if (!courseName || typeof courseName !== "string" || courseName.trim().length === 0) {
      return NextResponse.json(
        { error: "Course name is required" },
        { status: 400 }
      );
    }

    // Check admin private key
    if (!ADMIN_PRIVATE_KEY) {
      console.error("ADMIN_PRIVATE_KEY not configured");
      return NextResponse.json(
        { error: "Server configuration error: Admin key not set" },
        { status: 500 }
      );
    }

    console.log("Deploying pool for course:", courseName);

    // Connect to provider with admin wallet
    const provider = new JsonRpcProvider(RPC_URL);
    const adminWallet = new Wallet(ADMIN_PRIVATE_KEY, provider);
    
    console.log("Admin wallet address:", adminWallet.address);

    // Check admin balance
    const balance = await provider.getBalance(adminWallet.address);
    console.log("Admin balance:", balance.toString());
    
    if (balance === BigInt(0)) {
      return NextResponse.json(
        { error: "Admin wallet has insufficient balance for gas" },
        { status: 500 }
      );
    }

    // Create factory contract instance with admin wallet
    const factory = new Contract(FACTORY_ADDRESS, POOL_COURSE_FACTORY_ABI, adminWallet);

    // Estimate gas
    let gasLimit: bigint;
    try {
      const gasEstimate = await factory.createPool.estimateGas(courseName);
      gasLimit = (gasEstimate * BigInt(120)) / BigInt(100); // Add 20% buffer
      console.log("Gas estimate:", gasEstimate.toString());
    } catch (error) {
      console.warn("Gas estimation failed, using default:", error);
      gasLimit = BigInt(500000);
    }

    // Send transaction
    console.log("Sending transaction...");
    const tx = await factory.createPool(courseName, {
      gasLimit,
    });

    console.log("Transaction sent:", tx.hash);

    // Wait for confirmation
    const receipt = await tx.wait();

    if (!receipt || receipt.status !== 1) {
      return NextResponse.json(
        { error: "Transaction failed" },
        { status: 500 }
      );
    }

    console.log("Transaction confirmed:", receipt.hash);

    // Parse PoolCourseCreated event to get pool address
    const poolAddress = parsePoolCreatedEvent(receipt);

    if (!poolAddress) {
      return NextResponse.json(
        { error: "Could not find pool address in transaction logs" },
        { status: 500 }
      );
    }

    // Verify pool info
    const poolInfo = await factory.getPoolInfo(poolAddress);

    console.log("Pool deployed successfully:", {
      poolAddress,
      courseName: poolInfo[2],
      creator: poolInfo[1],
    });

    return NextResponse.json({
      success: true,
      poolAddress,
      transactionHash: receipt.hash,
      courseName: poolInfo[2],
      creator: poolInfo[1],
      createdAt: poolInfo[3].toString(),
      isActive: poolInfo[4],
    });
  } catch (error) {
    console.error("Error deploying pool:", error);
    
    return NextResponse.json(
      {
        error: "Failed to deploy pool",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

/**
 * Parse PoolCourseCreated event from transaction receipt
 */
function parsePoolCreatedEvent(receipt: any): string | null {
  // PoolCourseCreated event has signature: PoolCourseCreated(address indexed pool, address indexed creator, string courseName, uint256 timestamp)
  // The pool address is the first indexed parameter (topics[1])
  
  for (const log of receipt.logs) {
    try {
      // Check if this log is from the factory contract
      if (log.address.toLowerCase() !== FACTORY_ADDRESS.toLowerCase()) {
        continue;
      }

      // The pool address should be in topics[1] (first indexed parameter)
      if (log.topics && log.topics.length > 1) {
        // Extract address from topics[1] (remove padding)
        const poolAddress = "0x" + log.topics[1].slice(-40);
        
        // Validate it's a valid address
        if (poolAddress.match(/^0x[a-fA-F0-9]{40}$/)) {
          return poolAddress;
        }
      }
    } catch (error) {
      console.warn("Failed to parse log:", error);
    }
  }

  return null;
}

/**
 * GET /api/pool/deploy?address=0x...
 * 
 * Get pool info by address
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get("address");

    if (!address) {
      return NextResponse.json(
        { error: "Pool address is required" },
        { status: 400 }
      );
    }

    // Connect to provider
    const provider = new JsonRpcProvider(RPC_URL);
    const factory = new Contract(FACTORY_ADDRESS, POOL_COURSE_FACTORY_ABI, provider);

    // Get pool info
    const poolInfo = await factory.getPoolInfo(address);

    return NextResponse.json({
      poolAddress: poolInfo[0],
      creator: poolInfo[1],
      courseName: poolInfo[2],
      createdAt: poolInfo[3].toString(),
      isActive: poolInfo[4],
    });
  } catch (error) {
    console.error("Error getting pool info:", error);
    
    return NextResponse.json(
      {
        error: "Failed to get pool info",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
