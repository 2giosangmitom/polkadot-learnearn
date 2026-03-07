"use client";

import React from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LunoKitProvider } from "@luno-kit/ui";
import "@luno-kit/ui/styles.css";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { walletConfig } from "@/lib/wallet-config";
import { WalletSync } from "@/components/wallet-sync";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
});

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem
      disableTransitionOnChange
    >
      <QueryClientProvider client={queryClient}>
        <LunoKitProvider
          config={walletConfig}
          theme={{ autoMode: true, defaultMode: "dark" }}
          appInfo={{
            description: "Learn blockchain development and earn crypto rewards",
          }}
        >
          <TooltipProvider>
            <WalletSync />
            {children}
            <Toaster richColors position="top-right" />
          </TooltipProvider>
        </LunoKitProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
