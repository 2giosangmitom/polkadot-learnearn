'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { LunoProvider, createConfig, createStorage } from '@luno-kit/react';
import { paseoAssetHub } from '@luno-kit/react/chains';
import {
  polkadotjsConnector,
  subwalletConnector,
  talismanConnector,
  enkryptConnector,
  polkagateConnector,
  walletConnectConnector,
} from '@luno-kit/react/connectors';

interface WalletProviderProps {
  children: ReactNode;
}

export function WalletProvider({ children }: WalletProviderProps) {
  const [queryClient] = useState(() => new QueryClient());
  const [config, setConfig] = useState<ReturnType<typeof createConfig> | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const storage = createStorage({
      storage: window.localStorage,
      keyPrefix: 'learnearn-luno',
    });

    const supportedChains = [paseoAssetHub.genesisHash];

    const connectors = [
      polkadotjsConnector(),
      subwalletConnector(),
      talismanConnector(),
      enkryptConnector(),
      polkagateConnector(),
      walletConnectConnector({
        projectId: process.env.NEXT_PUBLIC_WC_PROJECT_ID || '',
        metadata: {
          name: 'Learn & Earn',
          description: 'Learn Polkadot on Paseo Testnet with SMOL402',
          url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
          icons: [
            'https://raw.githubusercontent.com/Luno-lab/LunoKit/main/assets/logo.png',
          ],
        },
        supportedChains,
      }),
    ];

    const cfg = createConfig({
      appName: 'Learn & Earn',
      chains: [paseoAssetHub],
      connectors,
      transports: {
        [paseoAssetHub.genesisHash]: paseoAssetHub.rpcUrls.webSocket,
      },
      storage,
      autoConnect: true,
    });

    setConfig(cfg);
  }, []);

  const readyConfig = useMemo(() => config, [config]);

  if (!readyConfig) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Initializing wallet...</p>
        </div>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <LunoProvider config={readyConfig}>{children}</LunoProvider>
    </QueryClientProvider>
  );
}
