"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Wallet, AlertTriangle } from "lucide-react";
import { useWalletProvider } from "@/hooks/use-wallet-provider";
import { NetworkStatus } from "./network-status";
import { useState } from "react";

interface WalletConnectProps {
  showNetworkStatus?: boolean;
  compact?: boolean;
}

export function WalletConnect({ showNetworkStatus = true, compact = false }: WalletConnectProps) {
  const { 
    metamaskAddress, 
    isConnected, 
    isCorrectNetwork, 
    connect, 
    switchNetwork, 
    disconnect 
  } = useWalletProvider();
  const [isConnecting, setIsConnecting] = useState(false);

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      await connect();
    } catch (error) {
      console.error("Failed to connect wallet:", error);
    } finally {
      setIsConnecting(false);
    }
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        {isConnected ? (
          <>
            <div className="text-sm">
              <code className="text-xs bg-muted px-2 py-1 rounded">
                {metamaskAddress?.slice(0, 6)}...{metamaskAddress?.slice(-4)}
              </code>
            </div>
            {showNetworkStatus && <NetworkStatus />}
            <Button size="sm" variant="outline" onClick={disconnect}>
              Disconnect
            </Button>
          </>
        ) : (
          <Button size="sm" onClick={handleConnect} disabled={isConnecting}>
            <Wallet className="h-4 w-4 mr-2" />
            {isConnecting ? "Connecting..." : "Connect Wallet"}
          </Button>
        )}
      </div>
    );
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wallet className="h-5 w-5" />
          Wallet Connection
        </CardTitle>
        <CardDescription>
          Connect your wallet to interact with course pools
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isConnected ? (
          <Button 
            onClick={handleConnect} 
            disabled={isConnecting}
            className="w-full"
          >
            <Wallet className="h-4 w-4 mr-2" />
            {isConnecting ? "Connecting..." : "Connect MetaMask"}
          </Button>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Address:</span>
              <code className="text-xs bg-muted px-2 py-1 rounded">
                {metamaskAddress?.slice(0, 6)}...{metamaskAddress?.slice(-4)}
              </code>
            </div>

            {showNetworkStatus && (
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Network:</span>
                <NetworkStatus />
              </div>
            )}

            {!isCorrectNetwork && (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-center gap-2 text-yellow-800 text-sm">
                  <AlertTriangle className="h-4 w-4" />
                  <span>Please switch to Polkadot Hub Testnet to interact with contracts</span>
                </div>
              </div>
            )}

            <Button 
              variant="outline" 
              onClick={disconnect}
              className="w-full"
            >
              Disconnect
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}