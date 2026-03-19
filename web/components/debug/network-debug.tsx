"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useWalletProvider } from "@/hooks/use-wallet-provider";
import { DEFAULT_NETWORK, getNetworkByChainId } from "@/lib/networks";
import { useState } from "react";

export function NetworkDebug() {
  const { 
    chainId, 
    isConnected, 
    isCorrectNetwork, 
    switchNetwork, 
    connect,
    metamaskAddress 
  } = useWalletProvider();
  
  const [debugInfo, setDebugInfo] = useState<string>("");
  const [isSwitching, setIsSwitching] = useState(false);

  const currentNetwork = chainId ? getNetworkByChainId(chainId) : null;

  const handleSwitchNetwork = async () => {
    setIsSwitching(true);
    setDebugInfo("Starting network switch...");
    
    try {
      await switchNetwork();
      setDebugInfo("Network switch completed successfully!");
    } catch (error) {
      setDebugInfo(`Network switch failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSwitching(false);
    }
  };

  const testEthereumProvider = () => {
    if (window.ethereum) {
      setDebugInfo(`Ethereum provider found: ${window.ethereum.isMetaMask ? 'MetaMask' : 'Other'}`);
    } else {
      setDebugInfo("No Ethereum provider found");
    }
  };

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle>Network Debug</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm">Connected:</span>
            <Badge variant={isConnected ? "default" : "secondary"}>
              {isConnected ? "Yes" : "No"}
            </Badge>
          </div>
          
          {isConnected && (
            <div className="flex justify-between">
              <span className="text-sm">Address:</span>
              <code className="text-xs">
                {metamaskAddress?.slice(0, 6)}...{metamaskAddress?.slice(-4)}
              </code>
            </div>
          )}
          
          <div className="flex justify-between">
            <span className="text-sm">Current Chain:</span>
            <Badge variant="outline">
              {chainId || "Unknown"}
            </Badge>
          </div>
          
          <div className="flex justify-between">
            <span className="text-sm">Current Network:</span>
            <span className="text-xs">
              {currentNetwork?.name || "Unknown"}
            </span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-sm">Target Chain:</span>
            <Badge variant="outline">
              {DEFAULT_NETWORK.chainId}
            </Badge>
          </div>
          
          <div className="flex justify-between">
            <span className="text-sm">Target Hex:</span>
            <code className="text-xs">
              0x{DEFAULT_NETWORK.chainId.toString(16)}
            </code>
          </div>
          
          <div className="flex justify-between">
            <span className="text-sm">Correct Network:</span>
            <Badge variant={isCorrectNetwork ? "default" : "destructive"}>
              {isCorrectNetwork ? "Yes" : "No"}
            </Badge>
          </div>
        </div>

        <div className="space-y-2">
          {!isConnected && (
            <Button onClick={connect} className="w-full">
              Connect Wallet
            </Button>
          )}
          
          <Button onClick={testEthereumProvider} variant="outline" className="w-full">
            Test Ethereum Provider
          </Button>
          
          <Button 
            onClick={handleSwitchNetwork} 
            variant="destructive" 
            className="w-full"
            disabled={isSwitching}
          >
            {isSwitching ? "Switching..." : "Switch Network"}
          </Button>
        </div>

        {debugInfo && (
          <div className="p-2 bg-muted rounded text-xs">
            <strong>Debug:</strong> {debugInfo}
          </div>
        )}
      </CardContent>
    </Card>
  );
}