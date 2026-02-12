'use client';

import { useEffect, useState } from 'react';
import { useBalance, useDisconnect, useAccounts } from '@luno-kit/react';
import { Wallet, LogOut, Copy, Check, ChevronDown, Pencil, RefreshCw } from 'lucide-react';
import { formatAddress } from '@/lib/polkadot';

interface Account {
  address: string;
  name?: string;
}

interface WalletInfoProps {
  address: string;
  accounts: Account[];
  displayName?: string;
  role?: string;
  onConnect?: (address: string, balance: string) => void;
  onEditProfile?: () => void;
  className?: string;
}

export function WalletInfo({ 
  address, 
  accounts,
  displayName, 
  role, 
  onConnect, 
  onEditProfile, 
  className = '' 
}: WalletInfoProps) {
  const { data: balanceData, isLoading: balanceLoading } = useBalance({ address });
  const { disconnectAsync } = useDisconnect();
  const { selectAccount } = useAccounts();
  const [copied, setCopied] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    if (address && balanceData?.formattedTransferable && onConnect) {
      onConnect(address, balanceData.formattedTransferable);
    }
  }, [address, balanceData?.formattedTransferable, onConnect]);

  async function handleDisconnect() {
    try {
      await disconnectAsync();
      setShowDropdown(false);
    } catch (error) {
      console.error('❌ Disconnect failed:', error);
    }
  }

  async function handleCopyAddress() {
    try {
      await navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy address:', error);
    }
  }

  async function handleSwitchAccount(account: Account) {
    try {
      selectAccount(account);
      setShowDropdown(false);
    } catch (error) {
      console.error('❌ Failed to switch account:', error);
    }
  }

  const formattedBalance = balanceLoading
    ? 'Loading...'
    : balanceData?.formattedTransferable || '0';

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center gap-3 bg-[#11131a] hover:bg-[#1a1d26] border border-[#1f2430] hover:border-[#e6007a] px-4 py-2.5 rounded-lg transition-all group"
      >
        <div className="w-9 h-9 bg-gradient-to-br from-[#e6007a] to-[#cc006c] rounded-full flex items-center justify-center group-hover:scale-105 transition-transform shadow-sm">
          <Wallet className="w-4 h-4 text-white" />
        </div>
        <div className="flex flex-col items-start">
          <span className="text-sm font-semibold text-[#e5e7eb]">
            {displayName || formatAddress(address)}
          </span>
          <span className="text-xs text-[#9ca3af] font-medium">
            {formattedBalance} PAS
          </span>
        </div>
        <ChevronDown className={`w-4 h-4 text-[#9ca3af] group-hover:text-[#e5e7eb] transition-all ${showDropdown ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {showDropdown && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowDropdown(false)}
          />
          <div className="absolute right-0 mt-2 w-80 bg-[#0f1117] border border-[#1f2430] rounded-xl shadow-2xl z-20 overflow-hidden animate-slideDown">
            {/* Current Account Info */}
            <div className="p-5 border-b border-[#1f2430] bg-[#11131a]">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 bg-gradient-to-br from-[#e6007a] to-[#cc006c] rounded-full flex items-center justify-center shadow-md">
                    <Wallet className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-[#9ca3af] font-medium">Connected Wallet</p>
                    <p className="text-sm font-bold text-[#e5e7eb]">
                      {displayName || formatAddress(address)}
                    </p>
                    {displayName && (
                      <p className="text-xs text-[#9ca3af]">{formatAddress(address)}</p>
                    )}
                    {role && (
                      <span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium bg-[#e6007a]/10 text-[#e6007a] rounded-full capitalize">
                        {role}
                      </span>
                    )}
                  </div>
                </div>
                {onEditProfile && (
                  <button
                    onClick={onEditProfile}
                    className="p-2 text-[#9ca3af] hover:text-[#e6007a] hover:bg-[#1a1d26] rounded-lg transition-all"
                    title="Edit Profile"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                )}
              </div>
              
              <div className="bg-[#0f1117] border border-[#1f2430] rounded-lg p-3">
                <p className="text-xs text-[#9ca3af] mb-1 font-medium">Balance</p>
                <p className="text-xl font-bold text-[#e5e7eb]">
                  {formattedBalance} <span className="text-sm text-[#9ca3af]">PAS</span>
                </p>
              </div>
            </div>

            {/* Account Switcher */}
            {accounts.length > 1 && (
              <div className="p-3 border-b border-[#1f2430]">
                <div className="flex items-center justify-between mb-2 px-2">
                  <p className="text-xs font-semibold text-[#9ca3af] uppercase tracking-wide">
                    Switch Account
                  </p>
                  <span className="text-xs text-[#9ca3af] bg-[#1a1d26] px-2 py-0.5 rounded-full">
                    {accounts.length} accounts
                  </span>
                </div>
                <div className="space-y-1 max-h-48 overflow-y-auto custom-scrollbar">
                  {accounts.map((account) => (
                    <button
                      key={account.address}
                      onClick={() => handleSwitchAccount(account)}
                      disabled={account.address === address}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg transition-all text-left group ${
                        account.address === address
                          ? 'bg-[#e6007a]/10 border border-[#e6007a]/20'
                          : 'hover:bg-[#1a1d26] border border-transparent'
                      } disabled:cursor-default`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                        account.address === address
                          ? 'bg-gradient-to-br from-[#e6007a] to-[#cc006c] text-white'
                          : 'bg-[#1a1d26] text-[#9ca3af] group-hover:bg-[#e6007a]/20 group-hover:text-[#e6007a]'
                      } transition-all`}>
                        {account.name ? account.name[0].toUpperCase() : '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold truncate ${
                          account.address === address ? 'text-[#e6007a]' : 'text-[#e5e7eb] group-hover:text-[#e6007a]'
                        } transition-colors`}>
                          {account.name || 'Unknown'}
                        </p>
                        <p className="text-xs text-[#9ca3af] truncate">{formatAddress(account.address)}</p>
                      </div>
                      {account.address === address && (
                        <div className="w-2 h-2 bg-[#e6007a] rounded-full"></div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="p-2 bg-[#0f1117]">
              <button
                onClick={handleCopyAddress}
                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-[#1a1d26] rounded-lg transition-all text-left group"
              >
                {copied ? (
                  <Check className="w-4 h-4 text-green-500" />
                ) : (
                  <Copy className="w-4 h-4 text-[#9ca3af] group-hover:text-[#e6007a]" />
                )}
                <span className={`text-sm font-medium ${
                  copied ? 'text-green-500' : 'text-[#e5e7eb] group-hover:text-[#e6007a]'
                } transition-colors`}>
                  {copied ? 'Address Copied!' : 'Copy Address'}
                </span>
              </button>

              <button
                onClick={handleDisconnect}
                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-red-500/10 rounded-lg transition-all text-left group"
              >
                <LogOut className="w-4 h-4 text-red-500" />
                <span className="text-sm font-semibold text-red-500">Disconnect</span>
              </button>
            </div>
          </div>
        </>
      )}

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #11131a;
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #1f2430;
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #e6007a;
        }
      `}</style>
    </div>
  );
}
