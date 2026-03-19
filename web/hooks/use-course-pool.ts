import { useState, useEffect } from 'react';
import { 
  getTotalBalanceCoursePool, 
  getCoursePoolSponsors, 
  getCoursePoolSponsorCount,
  getTotalSponsoredAmount 
} from '@/helper/course-pool';

interface Sponsor {
  addr: string;
  amount: bigint;
  timestamp: bigint;
}

interface CoursePoolData {
  poolBalance: { raw: bigint; formatted: string } | null;
  totalSponsored: { raw: bigint; formatted: string } | null;
  sponsors: Sponsor[];
  sponsorCount: bigint | null;
  loading: boolean;
  error: string | null;
}

interface UseCoursePoolReturn {
  poolData: CoursePoolData;
  refreshData: () => Promise<void>;
}

export function useCoursePool(coursePoolAddress: string | null | undefined): UseCoursePoolReturn {
  const [poolData, setPoolData] = useState<CoursePoolData>({
    poolBalance: null,
    totalSponsored: null,
    sponsors: [],
    sponsorCount: null,
    loading: false,
    error: null,
  });

  const fetchPoolData = async () => {
    if (!coursePoolAddress) {
      setPoolData(prev => ({
        ...prev,
        poolBalance: null,
        totalSponsored: null,
        sponsors: [],
        sponsorCount: null,
        loading: false,
        error: null,
      }));
      return;
    }

    setPoolData(prev => ({ ...prev, loading: true, error: null }));

    try {
      // Fetch all data in parallel using public provider
      const [poolBalance, totalSponsored, sponsors, sponsorCount] = await Promise.all([
        getTotalBalanceCoursePool(coursePoolAddress),
        getTotalSponsoredAmount(coursePoolAddress),
        getCoursePoolSponsors(coursePoolAddress),
        getCoursePoolSponsorCount(coursePoolAddress),
      ]);

      setPoolData({
        poolBalance,
        totalSponsored,
        sponsors,
        sponsorCount,
        loading: false,
        error: null,
      });
    } catch (error) {
      console.error('Error fetching pool data:', error);
      setPoolData(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch pool data',
      }));
    }
  };

  useEffect(() => {
    fetchPoolData();
  }, [coursePoolAddress]);

  return {
    poolData,
    refreshData: fetchPoolData,
  };
}

// Helper function to format sponsor data for display
export function formatSponsorData(sponsors: Sponsor[]) {
  return sponsors.map(sponsor => ({
    address: sponsor.addr,
    amount: sponsor.amount,
    timestamp: new Date(Number(sponsor.timestamp) * 1000),
    shortAddress: `${sponsor.addr.slice(0, 6)}...${sponsor.addr.slice(-4)}`,
  }));
}

// Helper function to calculate total unique sponsors
export function getUniqueSponsorCount(sponsors: Sponsor[]): number {
  const uniqueAddresses = new Set(sponsors.map(s => s.addr.toLowerCase()));
  return uniqueAddresses.size;
}

// Helper function to get top sponsors by total amount
export function getTopSponsors(sponsors: Sponsor[], limit: number = 5) {
  const sponsorTotals = new Map<string, bigint>();
  
  // Aggregate amounts by address
  sponsors.forEach(sponsor => {
    const addr = sponsor.addr.toLowerCase();
    const currentTotal = sponsorTotals.get(addr) || BigInt(0);
    sponsorTotals.set(addr, currentTotal + sponsor.amount);
  });

  // Convert to array and sort by amount
  return Array.from(sponsorTotals.entries())
    .map(([addr, amount]) => ({
      address: addr,
      totalAmount: amount,
      shortAddress: `${addr.slice(0, 6)}...${addr.slice(-4)}`,
    }))
    .sort((a, b) => (a.totalAmount > b.totalAmount ? -1 : 1))
    .slice(0, limit);
}