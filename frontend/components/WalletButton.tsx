"use client";

import { useEffect, useMemo, useState } from "react";
import {
  useAccount,
  useAccounts,
  useBalance,
  useConnect,
  useDisconnect,
  ConnectionStatus,
} from "@luno-kit/react";
import { paseoAssetHub } from "@luno-kit/react/chains";
import { Wallet } from "lucide-react";
import { formatAddress } from "@/lib/polkadot";

interface WalletButtonProps {
  onConnect: (address: string, balance: string) => void;
}

export default function WalletButton({ onConnect }: WalletButtonProps) {
  const { connectors, connectAsync, status, isPending } = useConnect();
  const { disconnectAsync } = useDisconnect();
  const { accounts, selectAccount } = useAccounts();
  const { account, address } = useAccount();
  const { data: balanceData, isLoading: balanceLoading } = useBalance({ address });
  const [selectedConnectorId, setSelectedConnectorId] = useState<string | null>(null);

  useEffect(() => {
    if (!address && accounts.length > 0) {
      selectAccount(accounts[0]);
    }
  }, [accounts, address, selectAccount]);

  useEffect(() => {
    if (address && balanceData?.formattedTransferable) {
      onConnect(address, balanceData.formattedTransferable);
    }
  }, [address, balanceData?.formattedTransferable, onConnect]);

  const orderedConnectors = useMemo(() => {
    const preferred = [
      "polkadot-js",
      "subwallet-js",
      "talisman",
      "enkrypt",
      "polkagate",
      "nova",
      "wallet-connect",
    ];

    return [...connectors].sort((a, b) => preferred.indexOf(a.id) - preferred.indexOf(b.id));
  }, [connectors]);

  async function handleConnect(connectorId: string) {
    try {
      setSelectedConnectorId(connectorId);
      await connectAsync({ connectorId, targetChainId: paseoAssetHub.genesisHash });
    } catch (error) {
      console.error("❌ Wallet connection failed:", error);
      alert(error instanceof Error ? error.message : "Failed to connect wallet");
    } finally {
      setSelectedConnectorId(null);
    }
  }

  async function handleDisconnect() {
    try {
      await disconnectAsync();
    } catch (error) {
      console.error("❌ Disconnect failed:", error);
    }
  }

  const isConnecting = status === ConnectionStatus.Connecting;

  if (address) {
    return (
      <div className="flex items-center gap-3 bg-rose-50 px-4 py-2 rounded-lg border border-rose-100 shadow-sm">
        <Wallet className="w-5 h-5 text-[#e6007a]" />
        <div className="flex flex-col">
          <span className="text-sm font-mono text-rose-900">{formatAddress(address)}</span>
          <span className="text-xs text-rose-700">
            {balanceLoading ? "Loading..." : balanceData?.formattedTransferable || "0"}
          </span>
        </div>
        <button
          onClick={handleDisconnect}
          className="text-xs text-rose-700 hover:text-rose-900 underline"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {orderedConnectors.map((connector) => (
        <button
          key={connector.id}
          onClick={() => handleConnect(connector.id)}
          disabled={(isPending || isConnecting) && selectedConnectorId === connector.id}
          className="flex items-center gap-2 bg-[#e6007a] hover:bg-[#cc006c] text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 shadow-sm"
        >
          <Wallet className="w-4 h-4" />
          {(isPending || isConnecting) && selectedConnectorId === connector.id
            ? "Connecting..."
            : `Connect ${connector.name}`}
        </button>
      ))}
      {orderedConnectors.length === 0 && (
        <span className="text-sm text-rose-700">
          No compatible wallets detected. Install Polkadot.js, SubWallet, or Talisman.
        </span>
      )}
    </div>
  );
}