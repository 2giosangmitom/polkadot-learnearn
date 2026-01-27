"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LunoProvider, createConfig, createStorage } from "@luno-kit/react";
import { paseoAssetHub } from "@luno-kit/react/chains";
import {
  polkadotjsConnector,
  subwalletConnector,
  talismanConnector,
  enkryptConnector,
  polkagateConnector,
  walletConnectConnector,
} from "@luno-kit/react/connectors";

interface AppProvidersProps {
  children: ReactNode;
}

export default function AppProviders({ children }: AppProvidersProps) {
  const [queryClient] = useState(() => new QueryClient());
  const [config, setConfig] = useState<ReturnType<typeof createConfig> | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const storage = createStorage({
      storage: window.localStorage,
      keyPrefix: "learnearn-luno",
    });

    const connectors = [
      polkadotjsConnector(),
      subwalletConnector(),
      talismanConnector(),
      enkryptConnector(),
      polkagateConnector(),
      walletConnectConnector({
        projectId: process.env.NEXT_PUBLIC_WC_PROJECT_ID || "",
        metadata: {
          name: "Learn & Earn",
          description: "Learn Polkadot on Paseo Asset Hub with SMOL402",
          url: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
          icons: [
            "https://raw.githubusercontent.com/Luno-lab/LunoKit/main/assets/logo.png",
          ],
        },
        supportedChains: [paseoAssetHub.genesisHash],
      }),
    ];

    const cfg = createConfig({
      appName: "Learn & Earn",
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

  if (!readyConfig) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <LunoProvider config={readyConfig}>{children}</LunoProvider>
    </QueryClientProvider>
  );
}
