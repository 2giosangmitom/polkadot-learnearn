/**
 * Network configurations for the application
 */

export interface NetworkConfig {
  name: string;
  chainId: number;
  rpcUrl: string;
  blockExplorer?: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
}

export const NETWORKS: Record<string, NetworkConfig> = {
  polkadotHubTestnet: {
    name: 'Polkadot Hub Testnet',
    chainId: 420420417,
    rpcUrl: 'https://services.polkadothub-rpc.com/testnet',
    blockExplorer: 'https://polkadot-hub-testnet.blockscout.com',
    nativeCurrency: {
      name: 'PAS',
      symbol: 'PAS',
      decimals: 18,
    },
  },
};

// Default network for the application
export const DEFAULT_NETWORK = NETWORKS.polkadotHubTestnet;

// Helper function to get network config by chain ID
export function getNetworkByChainId(chainId: number): NetworkConfig | null {
  return Object.values(NETWORKS).find(network => network.chainId === chainId) || null;
}

// Helper function to check if a chain ID is supported
export function isSupportedNetwork(chainId: number): boolean {
  return Object.values(NETWORKS).some(network => network.chainId === chainId);
}