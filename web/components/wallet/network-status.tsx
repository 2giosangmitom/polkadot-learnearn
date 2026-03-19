"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle, Wifi } from "lucide-react";
import { useWalletProvider } from "@/hooks/use-wallet-provider";
import { DEFAULT_NETWORK, getNetworkByChainId } from "@/lib/networks";

export function NetworkStatus() {
  const { chainId, isConnected, isCorrectNetwork, switchNetwork } = useWalletProvider();

  if (!isConnected) {
    return (
      <Badge variant="outline" className="gap-2">
        <Wifi className="h-3 w-3" />
        Not Connected
      </Badge>
    );
  }

  const currentNetwork = chainId ? getNetworkByChainId(chainId) : null;

  if (isCorrectNetwork) {
    return (
      <Badge variant="secondary" className="gap-2 bg-green-100 text-green-800 border-green-200">
        <CheckCircle className="h-3 w-3" />
        {DEFAULT_NETWORK.name}
      </Badge>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Badge variant="destructive" className="gap-2">
        <AlertCircle className="h-3 w-3" />
        {currentNetwork?.name || `Chain ${chainId}`}
      </Badge>
      <Button
        size="sm"
        variant="outline"
        onClick={switchNetwork}
        className="text-xs"
      >
        Switch to {DEFAULT_NETWORK.name}
      </Button>
    </div>
  );
}