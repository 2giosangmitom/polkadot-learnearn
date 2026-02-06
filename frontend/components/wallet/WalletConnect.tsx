'use client';

import { useEffect, useMemo, useState } from 'react';
import { useConnect, useAccounts, ConnectionStatus } from '@luno-kit/react';
import { paseo } from '@luno-kit/react/chains';
import { X, Wallet } from 'lucide-react';

interface WalletConnectProps {
  onClose: () => void;
  onConnect?: (address: string, balance: string) => void;
}

export function WalletConnect({ onClose, onConnect }: WalletConnectProps) {
  const { connectors, connectAsync, status, isPending } = useConnect();
  const { accounts, selectAccount } = useAccounts();
  const [selectedConnectorId, setSelectedConnectorId] = useState<string | null>(null);

  // Auto-select first account after connection
  useEffect(() => {
    if (accounts.length > 0) {
      selectAccount(accounts[0]);
      onClose();
    }
  }, [accounts, selectAccount, onClose]);

  const orderedConnectors = useMemo(() => {
    const preferred = [
      'subwallet-js',
    ];

    return [...connectors].sort(
      (a, b) => preferred.indexOf(a.id) - preferred.indexOf(b.id)
    );
  }, [connectors]);

  async function handleConnect(connectorId: string) {
    try {
      setSelectedConnectorId(connectorId);
      await connectAsync({
        connectorId,
        targetChainId: paseo.genesisHash,
      });
    } catch (error) {
      console.error('❌ Wallet connection failed:', error);
      alert(error instanceof Error ? error.message : 'Failed to connect wallet');
      setSelectedConnectorId(null);
    }
  }

  const isConnecting = status === ConnectionStatus.Connecting;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[85vh] overflow-y-auto animate-slideUp">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b-2 border-rose-100 bg-gradient-to-r from-rose-50 to-pink-50">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Connect Wallet</h2>
            <p className="text-sm text-gray-600 mt-1">Choose your preferred wallet</p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 hover:bg-rose-100 p-2 rounded-full transition-all"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {orderedConnectors.length > 0 ? (
            <div className="space-y-3">
              {orderedConnectors.map((connector) => (
                <button
                  key={connector.id}
                  onClick={() => handleConnect(connector.id)}
                  disabled={
                    (isPending || isConnecting) &&
                    selectedConnectorId === connector.id
                  }
                  className="w-full flex items-center gap-4 p-4 border-2 border-gray-200 rounded-xl hover:border-[#e6007a] hover:bg-gradient-to-br hover:from-rose-50 hover:to-pink-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
                >
                  <div className="w-12 h-12 bg-gradient-to-br from-gray-100 to-gray-50 rounded-xl flex items-center justify-center group-hover:from-rose-100 group-hover:to-pink-100 transition-all shadow-sm">
                    <Wallet className="w-6 h-6 text-[#e6007a]" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-semibold text-gray-900 group-hover:text-[#e6007a] transition-colors">
                      {connector.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      {(isPending || isConnecting) &&
                      selectedConnectorId === connector.id
                        ? 'Connecting...'
                        : 'Click to connect'}
                    </p>
                  </div>
                  {(isPending || isConnecting) &&
                    selectedConnectorId === connector.id && (
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-[#e6007a]"></div>
                    )}
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-10">
              <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Wallet className="w-10 h-10 text-gray-300" />
              </div>
              <p className="text-gray-700 font-semibold mb-2">No wallets detected</p>
              <p className="text-sm text-gray-500 mb-6">
                Please install a Polkadot wallet extension
              </p>
              <div className="space-y-3 max-w-xs mx-auto">
                <a
                  href="https://polkadot.js.org/extension/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-3 border-2 border-gray-200 rounded-lg hover:border-[#e6007a] hover:bg-rose-50 transition-all"
                >
                  <p className="font-semibold text-[#e6007a]">Polkadot.js Extension</p>
                  <p className="text-xs text-gray-500">Official Polkadot wallet</p>
                </a>
                <a
                  href="https://www.subwallet.app/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-3 border-2 border-gray-200 rounded-lg hover:border-[#e6007a] hover:bg-rose-50 transition-all"
                >
                  <p className="font-semibold text-[#e6007a]">SubWallet</p>
                  <p className="text-xs text-gray-500">Multi-chain wallet</p>
                </a>
                <a
                  href="https://talisman.xyz/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block p-3 border-2 border-gray-200 rounded-lg hover:border-[#e6007a] hover:bg-rose-50 transition-all"
                >
                  <p className="font-semibold text-[#e6007a]">Talisman</p>
                  <p className="text-xs text-gray-500">Beautiful Polkadot wallet</p>
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t-2 border-rose-100 bg-gradient-to-r from-rose-50 to-pink-50 rounded-b-2xl">
          <p className="text-xs text-gray-500 text-center">
            By connecting your wallet, you agree to our{' '}
            <span className="text-[#e6007a] font-medium">Terms of Service</span> and{' '}
            <span className="text-[#e6007a] font-medium">Privacy Policy</span>.
          </p>
        </div>
      </div>
    </div>
  );
}
