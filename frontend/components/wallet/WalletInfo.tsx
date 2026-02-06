'use client';

import { useEffect, useState } from 'react';
import { useBalance, useDisconnect } from '@luno-kit/react';
import { Wallet, LogOut, Copy, Check, ChevronDown, Pencil } from 'lucide-react';
import { formatAddress } from '@/lib/polkadot';

interface WalletInfoProps {
  address: string;
  displayName?: string;
  role?: string;
  onConnect?: (address: string, balance: string) => void;
  onEditProfile?: () => void;
  className?: string;
}

export function WalletInfo({ address, displayName, role, onConnect, onEditProfile, className = '' }: WalletInfoProps) {
  const { data: balanceData, isLoading: balanceLoading } = useBalance({ address });
  const { disconnectAsync } = useDisconnect();
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

  const formattedBalance = balanceLoading
    ? 'Loading...'
    : balanceData?.formattedTransferable || '0';

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center gap-3 bg-gradient-to-br from-rose-50 to-pink-50 hover:from-rose-100 hover:to-pink-100 px-5 py-2.5 rounded-xl border-2 border-rose-200 hover:border-rose-300 transition-all shadow-sm hover:shadow-md group"
      >
        <div className="w-8 h-8 bg-gradient-to-br from-[#e6007a] to-[#cc006c] rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
          <Wallet className="w-4 h-4 text-white" />
        </div>
        <div className="flex flex-col items-start">
          <span className="text-sm font-semibold text-rose-900">
            {displayName || formatAddress(address)}
          </span>
          <span className="text-[11px] text-rose-700 font-medium">
            {displayName ? formatAddress(address) : 'Wallet connected'}
          </span>
          <span className="text-xs text-rose-700 font-bold">
            {formattedBalance} DOT
          </span>
        </div>
        <ChevronDown className={`w-4 h-4 text-rose-700 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu */}
      {showDropdown && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowDropdown(false)}
          />
          <div className="absolute right-0 mt-3 w-80 bg-white rounded-xl shadow-2xl border-2 border-rose-100 z-20 overflow-hidden animate-slideDown">
            {/* Account Info */}
            <div className="p-5 border-b-2 border-rose-100 bg-gradient-to-br from-rose-50 via-pink-50 to-white">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-[#e6007a] to-[#cc006c] rounded-full flex items-center justify-center shadow-md">
                    <Wallet className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 font-medium">Connected Wallet</p>
                    <p className="text-sm font-bold text-gray-900">
                      {displayName || formatAddress(address)}
                    </p>
                    <p className="text-xs text-gray-600">{formatAddress(address)}</p>
                    {role && (
                      <span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium bg-rose-100 text-rose-700 rounded-full capitalize">
                        {role}
                      </span>
                    )}
                  </div>
                </div>
                {onEditProfile && (
                  <button
                    onClick={onEditProfile}
                    className="p-2 text-gray-500 hover:text-[#e6007a] hover:bg-rose-50 rounded-lg transition-colors"
                    title="Edit Profile"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                )}
              </div>
              
              <div className="bg-white rounded-lg p-4 border-2 border-rose-100 shadow-sm">
                <p className="text-xs text-gray-500 mb-1 font-medium">Balance</p>
                <p className="text-2xl font-bold bg-gradient-to-r from-[#e6007a] to-[#cc006c] bg-clip-text text-transparent">
                  {formattedBalance} DOT
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="p-2 bg-white">
              <button
                onClick={handleCopyAddress}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-rose-50 rounded-lg transition-colors text-left group"
              >
                {copied ? (
                  <Check className="w-5 h-5 text-green-600" />
                ) : (
                  <Copy className="w-5 h-5 text-gray-600 group-hover:text-[#e6007a]" />
                )}
                <div className="flex-1">
                  <span className="text-sm font-medium text-gray-700 group-hover:text-[#e6007a]">
                    {copied ? 'Address Copied!' : 'Copy Address'}
                  </span>
                  {!copied && (
                    <p className="text-xs text-gray-500">Copy to clipboard</p>
                  )}
                </div>
              </button>

              <button
                onClick={handleDisconnect}
                className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-50 rounded-lg transition-colors text-left group"
              >
                <LogOut className="w-5 h-5 text-red-600" />
                <div>
                  <span className="text-sm font-semibold text-red-600">Disconnect</span>
                  <p className="text-xs text-red-500">Sign out from wallet</p>
                </div>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
