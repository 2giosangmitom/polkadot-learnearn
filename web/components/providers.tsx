"use client";

import React, { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { LunoKitProvider } from "@luno-kit/ui";
import "@luno-kit/ui/styles.css";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { walletConfig } from "@/lib/wallet-config";
import { WalletSync } from "@/components/wallet-sync";
import { X402PaymentDialog } from "@/components/x402-payment-dialog";
import { useAuthStore } from "@/lib/auth-store";
import { connectAuthToApi, connectPaymentAgent } from "@/lib/api";
import { useX402Store } from "@/lib/x402";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
});

/**
 * Wire up the auth store and x402 agent to the API client.
 * This runs once on mount inside the provider tree.
 */
function AuthApiBridge() {
  const getAccessToken = useAuthStore((s) => s.getAccessToken);
  const refresh = useAuthStore((s) => s.refresh);
  const requestPayment = useX402Store((s) => s.requestPayment);

  useEffect(() => {
    connectAuthToApi(getAccessToken, refresh);
    connectPaymentAgent(requestPayment);
  }, [getAccessToken, refresh, requestPayment]);

  return null;
}

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
          theme={{
            autoMode: false,
            defaultMode: "light",
            colors: {
              accentColor: "var(--color-pink-400)",
            },
          }}
          appInfo={{
            description: "Learn blockchain development and earn crypto rewards",
          }}
        >
          <TooltipProvider>
            <AuthApiBridge />
            <WalletSync />
            {children}
            <X402PaymentDialog />
            <Toaster richColors position="top-right" />
          </TooltipProvider>
        </LunoKitProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
