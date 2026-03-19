/**
 * Hook to deploy PoolCourse contracts via API
 */

export interface DeployPoolResult {
  poolAddress: string;
  transactionHash: string;
}

/**
 * Deploy a new PoolCourse contract via the API
 * The API will use admin wallet to deploy the contract
 * 
 * @param courseName - Name of the course
 * @returns Pool address and transaction hash
 */
export async function deployPoolCourse(
  courseName: string
): Promise<DeployPoolResult> {
  if (!courseName || courseName.trim().length === 0) {
    throw new Error("Course name is required");
  }

  console.log("Deploying pool for course:", courseName);

  // Call API to deploy pool
  const response = await fetch("/api/pool/deploy", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      courseName: courseName.trim(),
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to deploy pool");
  }

  const result = await response.json();

  console.log("Pool deployed successfully:", result.poolAddress);

  return {
    poolAddress: result.poolAddress,
    transactionHash: result.transactionHash,
  };
}

/**
 * Get pool info by address
 */
export async function getPoolInfo(poolAddress: string): Promise<{
  poolAddress: string;
  creator: string;
  courseName: string;
  createdAt: string;
  isActive: boolean;
}> {
  const response = await fetch(`/api/pool/deploy?address=${poolAddress}`);

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Failed to get pool info");
  }

  return response.json();
}
