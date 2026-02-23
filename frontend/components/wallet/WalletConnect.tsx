'use client';

import { useEffect, useMemo, useState } from 'react';
import { useConnect, useAccounts, ConnectionStatus } from '@luno-kit/react';
import { paseoAssetHub } from '@luno-kit/react/chains';
import { X, Wallet, ExternalLink } from 'lucide-react';
import Modal, { useModal } from '@/components/Modal';

interface WalletConnectProps {
  onClose: () => void;
  onConnect?: (address: string, balance: string) => void;
}

const walletIcons: Record<string, string> = {
  'polkadotjs': '🟣',
  'subwallet-js': '🔵',
  'talisman': '🔮',
  'enkrypt': '🦊',
  'polkagate': '🚪',
};

export function WalletConnect({ onClose, onConnect }: WalletConnectProps) {
  const { connectors, connectAsync, status, isPending } = useConnect();
  const { accounts, selectAccount } = useAccounts();
  const [selectedConnectorId, setSelectedConnectorId] = useState<string | null>(null);
  const { modalState, showModal, hideModal } = useModal();

  // Auto-select first account after successful connection
  useEffect(() => {
    if (accounts.length > 0 && status === ConnectionStatus.Connected) {
      console.log('✅ Connected, selecting account:', accounts[0].address);
      selectAccount(accounts[0]);
      onClose();
    }
  }, [accounts, status, selectAccount, onClose]);

  const orderedConnectors = useMemo(() => {
    const preferred = [
      'subwallet-js',
      'talisman',
      'polkadotjs',
      'enkrypt',
      'polkagate',
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
        targetChainId: paseoAssetHub.genesisHash,
      });
    } catch (error) {
      console.error('❌ Wallet connection failed:', error);
      showModal(error instanceof Error ? error.message : 'Unable to connect wallet', {
        type: 'error',
        title: 'Connection Error'
      });
      setSelectedConnectorId(null);
    }
  }

  const isConnecting = status === ConnectionStatus.Connecting;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="bg-[#0f1117] border border-[#1f2430] rounded-xl shadow-2xl max-w-md w-full max-h-[85vh] overflow-y-auto animate-slideUp">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[#1f2430]">
          <div>
            <h2 className="text-2xl font-bold text-[#e5e7eb]">Connect Wallet</h2>
            <p className="text-sm text-[#9ca3af] mt-1">Choose your preferred wallet extension</p>
          </div>
          <button
            onClick={onClose}
            className="text-[#9ca3af] hover:text-[#e5e7eb] hover:bg-[#1a1d26] p-2 rounded-full transition-all"
          >
            <X className="w-5 h-5" />
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
                  className="w-full flex items-center gap-4 p-4 bg-[#11131a] border border-[#1f2430] rounded-lg hover:border-[#e6007a] hover:bg-[#1a1d26] transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
                >
                  <div className="w-12 h-12 bg-[#1a1d26] rounded-lg flex items-center justify-center group-hover:bg-[#e6007a]/10 transition-all text-2xl">
                    {walletIcons[connector.id] || <Wallet className="w-6 h-6 text-[#e6007a]" />}
                  </div>
                  <div className="flex-1 text-left">
                    <p className="font-semibold text-[#e5e7eb] group-hover:text-[#e6007a] transition-colors">
                      {connector.name}
                    </p>
                    <p className="text-xs text-[#9ca3af]">
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
              <div className="w-20 h-20 bg-[#1a1d26] rounded-full flex items-center justify-center mx-auto mb-4">
                <Wallet className="w-10 h-10 text-[#9ca3af]" />
              </div>
              <p className="text-[#e5e7eb] font-semibold mb-2">No wallets detected</p>
              <p className="text-sm text-[#9ca3af] mb-6">
                Please install a Polkadot wallet extension
              </p>
              <div className="space-y-3 max-w-xs mx-auto">
                <a
                  href="https://www.subwallet.app/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-4 bg-[#11131a] border border-[#1f2430] rounded-lg hover:border-[#e6007a] hover:bg-[#1a1d26] transition-all group"
                >
                  <div className="text-left">
                    <p className="font-semibold text-[#e5e7eb] group-hover:text-[#e6007a] transition-colors">SubWallet</p>
                    <p className="text-xs text-[#9ca3af]">Recommended multi-chain wallet</p>
                  </div>
                  <ExternalLink className="w-4 h-4 text-[#9ca3af] group-hover:text-[#e6007a]" />
                </a>
                <a
                  href="https://talisman.xyz/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-4 bg-[#11131a] border border-[#1f2430] rounded-lg hover:border-[#e6007a] hover:bg-[#1a1d26] transition-all group"
                >
                  <div className="text-left">
                    <p className="font-semibold text-[#e5e7eb] group-hover:text-[#e6007a] transition-colors">Talisman</p>
                    <p className="text-xs text-[#9ca3af]">Beautiful Polkadot wallet</p>
                  </div>
                  <ExternalLink className="w-4 h-4 text-[#9ca3af] group-hover:text-[#e6007a]" />
                </a>
                <a
                  href="https://polkadot.js.org/extension/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-between p-4 bg-[#11131a] border border-[#1f2430] rounded-lg hover:border-[#e6007a] hover:bg-[#1a1d26] transition-all group"
                >
                  <div className="text-left">
                    <p className="font-semibold text-[#e5e7eb] group-hover:text-[#e6007a] transition-colors">Polkadot.js</p>
                    <p className="text-xs text-[#9ca3af]">Official extension</p>
                  </div>
                  <ExternalLink className="w-4 h-4 text-[#9ca3af] group-hover:text-[#e6007a]" />
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-[#1f2430]">
          <p className="text-xs text-[#9ca3af] text-center">
            By connecting, you agree to our{' '}
            <span className="text-[#e6007a] font-medium cursor-pointer hover:underline">Terms of Service</span>
            {' '}and{' '}
            <span className="text-[#e6007a] font-medium cursor-pointer hover:underline">Privacy Policy</span>
          </p>
        </div>
      </div>

      <Modal
        isOpen={modalState.isOpen}
        onClose={hideModal}
        message={modalState.message}
        title={modalState.title}
        type={modalState.type}
        confirmText={modalState.confirmText}
        showCancel={modalState.showCancel}
        cancelText={modalState.cancelText}
        onConfirm={modalState.onConfirm}
      />
    </div>
  );
}
