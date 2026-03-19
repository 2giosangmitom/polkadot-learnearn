import { useEffect, useState, useCallback } from "react";
import {
  BrowserProvider,
  JsonRpcProvider,
  type Provider,
  type JsonRpcSigner,
} from "ethers";
import { DEFAULT_NETWORK, isSupportedNetwork, getNetworkByChainId } from "@/lib/networks";

declare global {
  interface Window {
    ethereum?: any;
  }
}

type UseWalletReturn = {
  provider: Provider | null;
  signer: JsonRpcSigner | null;
  metamaskAddress: string | null;
  chainId: number | null;
  isConnected: boolean;
  isCorrectNetwork: boolean;
  connect: () => Promise<void>;
  switchNetwork: () => Promise<void>;
  disconnect: () => void;
};

export function useWalletProvider(): UseWalletReturn {
  const [provider, setProvider] = useState<Provider | null>(null);
  const [signer, setSigner] = useState<JsonRpcSigner | null>(null);
  const [metamaskAddress, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  // Create a read-only provider for the default network
  const readOnlyProvider = new JsonRpcProvider(DEFAULT_NETWORK.rpcUrl);

  // Check if current network is supported
  const isCorrectNetwork = chainId ? isSupportedNetwork(chainId) : false;

  // Switch to the correct network
  const switchNetwork = useCallback(async () => {
    console.log('Attempting to switch network...');
    
    if (!window.ethereum) {
      console.error('No ethereum provider found');
      alert("Please install MetaMask!");
      return;
    }

    try {
      console.log('Switching to chain ID:', DEFAULT_NETWORK.chainId);
      console.log('Hex chain ID:', `0x${DEFAULT_NETWORK.chainId.toString(16)}`);
      
      // Try to switch to the network
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${DEFAULT_NETWORK.chainId.toString(16)}` }],
      });
      
      console.log('Network switch successful');
    } catch (switchError: any) {
      console.log('Switch error:', switchError);
      console.log('Error code:', switchError.code);
      
      // If the network doesn't exist, add it
      if (switchError.code === 4902) {
        console.log('Network not found, adding network...');
        try {
          await window.ethereum.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: `0x${DEFAULT_NETWORK.chainId.toString(16)}`,
              chainName: DEFAULT_NETWORK.name,
              nativeCurrency: DEFAULT_NETWORK.nativeCurrency,
              rpcUrls: [DEFAULT_NETWORK.rpcUrl],
              blockExplorerUrls: DEFAULT_NETWORK.blockExplorer ? [DEFAULT_NETWORK.blockExplorer] : undefined,
            }],
          });
          console.log('Network added successfully');
        } catch (addError) {
          console.error('Failed to add network:', addError);
          alert(`Failed to add network: ${addError instanceof Error ? addError.message : 'Unknown error'}`);
        }
      } else if (switchError.code === 4001) {
        // User rejected the request
        console.log('User rejected network switch');
      } else {
        console.error('Unexpected switch error:', switchError);
        alert(`Failed to switch network: ${switchError.message || 'Unknown error'}`);
      }
    }
  }, []);

  // Connect wallet
  const connect = useCallback(async () => {
    if (!window.ethereum) {
      throw new Error("No wallet found");
    }

    const browserProvider = new BrowserProvider(window.ethereum);

    await browserProvider.send("eth_requestAccounts", []);

    const signer = await browserProvider.getSigner();
    const address = await signer.getAddress();
    const network = await browserProvider.getNetwork();

    setProvider(browserProvider);
    setSigner(signer);
    setAddress(address);
    setChainId(Number(network.chainId));
    setIsConnected(true);

    // If not on correct network, prompt to switch
    if (!isSupportedNetwork(Number(network.chainId))) {
      try {
        await switchNetwork();
      } catch (error) {
        console.warn("Failed to switch network:", error);
      }
    }
  }, [switchNetwork]);

  // Disconnect wallet
  const disconnect = useCallback(() => {
    setProvider(readOnlyProvider);
    setSigner(null);
    setAddress(null);
    setChainId(null);
    setIsConnected(false);
  }, [readOnlyProvider]);

  useEffect(() => {
    // Set read-only provider by default
    setProvider(readOnlyProvider);

    if (!window.ethereum) return;

    // Check if already connected
    const checkConnection = async () => {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        if (accounts.length > 0) {
          const browserProvider = new BrowserProvider(window.ethereum);
          const network = await browserProvider.getNetwork();
          
          setAddress(accounts[0]);
          setChainId(Number(network.chainId));
          setIsConnected(true);
          setProvider(browserProvider);
          
          // Get signer if connected
          const signer = await browserProvider.getSigner();
          setSigner(signer);
        }
      } catch (error) {
        console.error("Error checking connection:", error);
      }
    };

    checkConnection();

    // Listen for account changes
    window.ethereum.on("accountsChanged", (accounts: string[]) => {
      if (accounts.length === 0) {
        disconnect();
      } else {
        setAddress(accounts[0]);
        // Reconnect to get new signer
        if (isConnected) {
          connect();
        }
      }
    });

    // Listen for chain changes
    window.ethereum.on("chainChanged", (chainIdHex: string) => {
      const newChainId = parseInt(chainIdHex, 16);
      setChainId(newChainId);
      
      // Update provider for new chain
      if (isConnected) {
        const browserProvider = new BrowserProvider(window.ethereum);
        setProvider(browserProvider);
      }
    });

    return () => {
      window.ethereum?.removeAllListeners?.("accountsChanged");
      window.ethereum?.removeAllListeners?.("chainChanged");
    };
  }, [readOnlyProvider, disconnect, connect, isConnected]);

  return { 
    provider, 
    signer, 
    metamaskAddress, 
    chainId, 
    isConnected,
    isCorrectNetwork,
    connect, 
    switchNetwork,
    disconnect 
  };
}