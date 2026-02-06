'use client';

import { useAccount, useBalance, useConnect, useDisconnect } from '@luno-kit/react';

/**
 * Custom hook để quản lý wallet state và actions
 */
export function useWallet() {
  const { address, account } = useAccount();
  const { data: balanceData, isLoading: isLoadingBalance } = useBalance({ address });
  const { connectAsync, status: connectStatus } = useConnect();
  const { disconnectAsync } = useDisconnect();

  const isConnected = !!address;
  const balance = balanceData?.formattedTransferable || '0';

  return {
    // State
    address,
    account,
    isConnected,
    balance,
    isLoadingBalance,
    connectStatus,
    balanceData,

    // Actions
    connect: connectAsync,
    disconnect: disconnectAsync,
  };
}
