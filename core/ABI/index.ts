/**
 * Smart Contract ABIs (TypeScript)
 * Centralized export for all contract ABIs with type safety
 */

import { POOL_COURSE_ABI, type PoolCourseContract, type Sponsor } from './PoolCourse.js';
import { POOL_COURSE_FACTORY_ABI, type PoolCourseFactoryContract, type PoolInfo } from './PoolCourseFactory.js';

// Named exports
export { POOL_COURSE_ABI, POOL_COURSE_FACTORY_ABI };

// Type exports
export type { PoolCourseContract, PoolCourseFactoryContract, Sponsor, PoolInfo };

// Combined export object
export const ABIS = {
  PoolCourse: POOL_COURSE_ABI,
  PoolCourseFactory: POOL_COURSE_FACTORY_ABI,
} as const;

// Network configuration type
export interface NetworkConfig {
  name: string;
  chainId: number;
  rpcUrl: string;
  blockExplorer?: string;
}

// Contract addresses type
export interface ContractAddresses {
  PoolCourseFactory: string | null;
}

// Contract addresses (to be updated after deployment)
export const CONTRACT_ADDRESSES: Record<string, ContractAddresses> = {
  // Polkadot Hub Testnet
  polkadotHubTestnet: {
    PoolCourseFactory: "0x62Bdb9A8Fed36e22272CA96661eB3F600e8f8F13",
  },
  // Add other networks as needed
};

export const NETWORKS: Record<string, NetworkConfig> = {
  polkadotHubTestnet: {
    name: 'Polkadot Hub Testnet',
    chainId: 420420417,
    rpcUrl: 'https://eth-rpc-testnet.polkadot.io',
    blockExplorer: 'https://polkadot-hub-testnet.blockscout.com',
  },
};

// Helper function to get contract address by network
export const getContractAddress = (contractName: keyof ContractAddresses, networkName: string): string | null => {
  return CONTRACT_ADDRESSES[networkName]?.[contractName] || null;
};

// Helper function to get network config
export const getNetworkConfig = (networkName: string): NetworkConfig | null => {
  return NETWORKS[networkName] || null;
};

// Contract function selectors (for advanced usage)
export const FUNCTION_SELECTORS = {
  PoolCourse: {
    sponsor: '0x0c340a24',
    payback: '0x35ed8ab8',
    batchPayback: '0x648f0433',
    getSponsors: '0x98f7c9b9',
    getSponsorCount: '0x62c2527b',
    poolBalance: '0x9553de4e',
    updateCourseName: '0x7245b4fe',
    pause: '0x8456cb59',
    unpause: '0x3f4ba83a',
  },
  PoolCourseFactory: {
    createPool: '0xf6c57861',
    createMultiplePools: '0x8ec08354',
    getAllPools: '0xd88ff1f4',
    getActivePools: '0x8eec5d70',
    getPoolCount: '0x7dbb6876',
    deactivatePool: '0x65c05106',
    reactivatePool: '0xe5bb7f27',
  },
} as const;

// Event signatures for filtering logs
export const EVENT_SIGNATURES = {
  PoolCourse: {
    Sponsored: '0x9671d13fb515ea1bac5217acd70f213ec297dab37be5ec45e53654b8c15d3b58',
    Payback: '0xad7daa402ba35c049966c9827828cb62d41be7729ab0b5c816ef79e08c2418c9',
    CourseNameUpdated: '0x20daefd0e9969a3b2417f4931b2f86ec115dd8bf22d046bc15ee664243ed883c',
    Paused: '0x62e78cea01bee320cd4e420270b5ea74000d11b0c9f74754ebdbfc544b05a258',
    Unpaused: '0x5db9ee0a495bf2e6ff9c91a7834c1ba4fdd244a5e8aa4e537bd38aeae4b073aa',
  },
  PoolCourseFactory: {
    PoolCourseCreated: '0xbd944e7f8748bae50b5699f1bd38810125a1d722d325665b0fd980713d590048',
    PoolDeactivated: '0x7f8382e4af20dea449a4de5e4390aaf141f7b0566bb975fbbd7cd4de748cb812',
    PoolReactivated: '0xfad69aed38960e20e0960b5ca560470964ae165e9a6084c78c797fb7967d9708',
    Paused: '0x62e78cea01bee320cd4e420270b5ea74000d11b0c9f74754ebdbfc544b05a258',
    Unpaused: '0x5db9ee0a495bf2e6ff9c91a7834c1ba4fdd244a5e8aa4e537bd38aeae4b073aa',
  },
} as const;

// Error signatures for error handling
export const ERROR_SIGNATURES = {
  Common: {
    EmptyCourseName: '0x52050879',
    EnforcedPause: '0xd93c0665',
    ExpectedPause: '0x8dfc202b',
    OwnableInvalidOwner: '0x1e4fbdf7',
    OwnableUnauthorizedAccount: '0x118cdaa7',
    ReentrancyGuardReentrantCall: '0x3ee5aeb5',
  },
  PoolCourse: {
    InvalidAddress: '0xe6c4247b',
    InvalidAmount: '0x2c5211c6',
    InsufficientBalance: '0xf4d678b8',
  },
  PoolCourseFactory: {
    InvalidPoolAddress: '0xda6a56c3',
    PoolNotFound: '0x76ecffc0',
    UnauthorizedPoolOperation: '0x411e4709',
  },
} as const;

export default ABIS;