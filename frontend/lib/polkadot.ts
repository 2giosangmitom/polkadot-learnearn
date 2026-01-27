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

// Paseo Asset Hub RPC
export const WS_PROVIDER = 'wss://paseo-asset-hub-rpc.polkadot.io';

let api: ApiPromise | null = null;

/**
 * Kết nối đến Polkadot node
 */
export async function getPolkadotApi(): Promise<ApiPromise> {
  if (api) return api;

  const provider = new WsProvider(WS_PROVIDER);
  api = await ApiPromise.create({ provider });
  
  console.log('✅ Connected to Polkadot:', await api.rpc.system.chain());
  return api;
}

/**
 * Kết nối ví Polkadot. js extension
 */
export async function connectWallet() {
  const { web3Enable, web3Accounts } = await getExtensionApi();

  // Enable extension
  const extensions = await web3Enable('Learn & Earn');
  
  if (extensions.length === 0) {
    throw new Error('No extension installed.  Please install Polkadot. js extension.');
  }

  // Get all accounts
  const accounts = await web3Accounts();
  
  if (accounts.length === 0) {
    throw new Error('No accounts found. Please create an account in Polkadot.js extension.');
  }

  return accounts;
}

/**
 * Lấy balance của account (in WND - Westend tokens)
 */
export async function getBalance(address: string): Promise<string> {
  const api = await getPolkadotApi();
  //@ts-ignore
  const { data:  { free } } = await api.query.system.account(address);
  
  // Convert from Planck (smallest unit) to WND
  const balance = (Number(free. toString()) / 1e12).toFixed(4);
  return balance;
}

/**
 * Gửi payment transaction
 */
export async function sendPayment(
  fromAddress: string,
  toAddress: string,
  amount: number // in WND
) {
  const api = await getPolkadotApi();
  const { web3FromAddress } = await getExtensionApi();
  
  // Convert WND to Planck (1 WND = 10^12 Planck)
  const amountInPlanck = BigInt(Math.floor(amount * 1e12));

  // Get injector for signing
  const injector = await web3FromAddress(fromAddress);

  // Create transfer transaction
  const transfer = api.tx.balances. transferKeepAlive(toAddress, amountInPlanck);

  // Sign and send
  return new Promise<string>((resolve, reject) => {
    transfer
      .signAndSend(fromAddress, { signer: injector. signer }, ({ status, txHash }) => {
        if (status.isInBlock) {
          console.log(`✅ Transaction included in block: ${txHash. toHex()}`);
          resolve(txHash.toHex());
        } else if (status.isFinalized) {
          console.log(`✅ Transaction finalized: ${txHash.toHex()}`);
        }
      })
      .catch(reject);
  });
}

/**
 * Format địa chỉ Polkadot (hiển thị ngắn gọn)
 */
export function formatAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}