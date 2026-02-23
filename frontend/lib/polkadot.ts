import { ApiPromise, WsProvider } from '@polkadot/api';

// Lazily load extension APIs to avoid SSR "window" references
let extensionApi:
  | {
      web3Accounts: typeof import('@polkadot/extension-dapp').web3Accounts;
      web3Enable: typeof import('@polkadot/extension-dapp').web3Enable;
      web3FromAddress: typeof import('@polkadot/extension-dapp').web3FromAddress;
    }
  | null = null;

async function getExtensionApi() {
  if (typeof window === 'undefined') {
    throw new Error('Polkadot extension is only available in the browser.');
  }

  if (!extensionApi) {
    extensionApi = await import('@polkadot/extension-dapp');
  }

  return extensionApi;
}

// Track if extension is enabled
let extensionEnabled = false;

/**
 * Ensure extension is enabled before using other web3 functions
 */
async function ensureExtensionEnabled() {
  if (extensionEnabled) return;
  
  const { web3Enable } = await getExtensionApi();
  const extensions = await web3Enable('Learn & Earn');
  
  if (extensions.length === 0) {
    throw new Error('No extension installed. Please install Polkadot.js extension.');
  }
  
  extensionEnabled = true;
  console.log('✅ Polkadot extension enabled');
}

// Paseo Asset Hub RPC - multiple official endpoints for fallback
export const RPC_ENDPOINTS = [
  'wss://sys.ibp.network/asset-hub-paseo',
];

let api: ApiPromise | null = null;
let currentEndpoint: string | null = null;

/**
 * Connect to Polkadot node with fallback endpoints
 */
export async function getPolkadotApi(): Promise<ApiPromise> {
  if (api && api.isConnected) return api;

  // Reset if disconnected
  if (api && !api.isConnected) {
    console.log('🔄 API disconnected, reconnecting...');
    api = null;
  }

  // Try each endpoint until one works
  for (const endpoint of RPC_ENDPOINTS) {
    try {
      console.log(`🔄 Trying to connect to: ${endpoint}`);
      
      const provider = new WsProvider(endpoint, 3000); // 3s auto-reconnect delay
      
      // Wait for connection with timeout
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          provider.disconnect();
          reject(new Error('Connection timeout'));
        }, 8000); // 8s timeout

        provider.on('connected', () => {
          clearTimeout(timeout);
          resolve();
        });

        provider.on('error', () => {
          clearTimeout(timeout);
          reject(new Error('Connection error'));
        });
      });

      api = await ApiPromise.create({ provider });
      currentEndpoint = endpoint;
      
      const chain = await api.rpc.system.chain();
      console.log(`✅ Connected to: ${chain} via ${endpoint}`);
      return api;
      
    } catch (error) {
      console.warn(`❌ Failed to connect to ${endpoint}:`, (error as Error).message);
      continue;
    }
  }

  throw new Error('Failed to connect to any Polkadot RPC endpoint. Please check your network connection.');
}

/**
 * Connect Polkadot.js extension wallet
 */
export async function connectWallet() {
  const { web3Accounts } = await getExtensionApi();

  // Enable extension first
  await ensureExtensionEnabled();

  // Get all accounts
  const accounts = await web3Accounts();
  
  if (accounts.length === 0) {
    throw new Error('No accounts found. Please create an account in Polkadot.js extension.');
  }

  return accounts;
}

/**
 * Get account balance (in PAS - Paseo tokens)
 */
export async function getBalance(address: string): Promise<string> {
  const api = await getPolkadotApi();
  //@ts-ignore
  const { data:  { free } } = await api.query.system.account(address);
  
  // Convert from Planck (smallest unit) to PAS (10 decimals on Paseo)
  const balance = (Number(free. toString()) / 1e10).toFixed(4);
  return balance;
}

/**
 * Send payment transaction
 * Returns object with both transactionHash and blockHash for verification
 */
export async function sendPayment(
  fromAddress: string,
  toAddress: string,
  amount: number // in PAS
): Promise<{ transactionHash: string; blockHash: string }> {
  const api = await getPolkadotApi();
  const { web3FromAddress } = await getExtensionApi();
  
  // Ensure extension is enabled before getting injector
  await ensureExtensionEnabled();
  
  // Convert PAS to Planck (1 PAS = 10^10 Planck on Paseo)
  const amountInPlanck = BigInt(Math.floor(amount * 1e10));

  // Get injector for signing
  const injector = await web3FromAddress(fromAddress);

  // Create transfer transaction
  const transfer = api.tx.balances.transferKeepAlive(toAddress, amountInPlanck);

  // Sign and send - return both transactionHash and blockHash for verification
  return new Promise((resolve, reject) => {
    transfer
      .signAndSend(fromAddress, { signer: injector.signer }, ({ status, txHash }) => {
        if (status.isInBlock) {
          const blockHash = status.asInBlock.toHex();
          const transactionHash = txHash.toHex();
          console.log(`✅ Transaction included in block: ${blockHash}`);
          console.log(`   Transaction hash: ${transactionHash}`);
          // Return both hashes
          resolve({ transactionHash, blockHash });
        } else if (status.isFinalized) {
          console.log(`✅ Transaction finalized in block: ${status.asFinalized.toHex()}`);
        }
      })
      .catch(reject);
  });
}

/**
 * Format Polkadot address (display in short form)
 */
export function formatAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}