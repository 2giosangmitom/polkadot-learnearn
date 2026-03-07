"use client";

import { createConfig, createStorage } from "@luno-kit/react";
import { paseoAssetHub } from "@luno-kit/react/chains";
import {
  polkadotjsConnector,
  subwalletConnector,
  talismanConnector,
} from "@luno-kit/react/connectors";

export const walletConfig = createConfig({
  appName: "Polkadot Learn & Earn",
  chains: [paseoAssetHub],
  connectors: [
    subwalletConnector(),
    talismanConnector(),
    polkadotjsConnector(),
  ],
  storage:
    typeof window !== "undefined"
      ? createStorage({ storage: window.localStorage })
      : undefined,
  autoConnect: true,
});
