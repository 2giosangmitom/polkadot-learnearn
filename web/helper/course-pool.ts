import { Contract, formatEther, JsonRpcProvider } from "ethers";
import { POOL_COURSE_ABI } from "./constant";
import { DEFAULT_NETWORK } from "@/lib/networks";

// Create a public provider for read-only operations
const publicProvider = new JsonRpcProvider(DEFAULT_NETWORK.rpcUrl);

export async function getTotalBalanceCoursePool(
  coursePoolAddress: string
): Promise<{ raw: bigint; formatted: string }> {
  const contract = new Contract(coursePoolAddress, POOL_COURSE_ABI, publicProvider);

  const value: bigint = await contract.poolBalance();

  return {
    raw: value,
    formatted: formatEther(value),
  };
}

// Get sponsors list from course pool
export async function getCoursePoolSponsors(
  coursePoolAddress: string
): Promise<Array<{ addr: string; amount: bigint; timestamp: bigint }>> {
  const contract = new Contract(coursePoolAddress, POOL_COURSE_ABI, publicProvider);
  
  const sponsors = await contract.getSponsors();
  return sponsors;
}

// Get sponsor count
export async function getCoursePoolSponsorCount(
  coursePoolAddress: string
): Promise<bigint> {
  const contract = new Contract(coursePoolAddress, POOL_COURSE_ABI, publicProvider);
  
  const count = await contract.getSponsorCount();
  return count;
}

// Get total sponsored amount (different from pool balance)
export async function getTotalSponsoredAmount(
  coursePoolAddress: string
): Promise<{ raw: bigint; formatted: string }> {
  const contract = new Contract(coursePoolAddress, POOL_COURSE_ABI, publicProvider);
  
  const value: bigint = await contract.totalSponsored();
  
  return {
    raw: value,
    formatted: formatEther(value),
  };
}

// Get course name from contract
export async function getCourseNameFromContract(
  coursePoolAddress: string
): Promise<string> {
  const contract = new Contract(coursePoolAddress, POOL_COURSE_ABI, publicProvider);
  
  const courseName = await contract.courseName();
  return courseName;
}

export async function sponsorCoursePool(
  coursePoolAddress: string,
  sponsorAddress: string
): Promise<void> {
  const contract = new Contract(coursePoolAddress, POOL_COURSE_ABI, publicProvider);
  const tx = await contract.sponsor({ from: sponsorAddress });
  await tx.wait();
  return tx;
}