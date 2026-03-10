"use client";

import { useEffect, useRef } from "react";
import { useAccount, useStatus, useSignMessage } from "@luno-kit/react";
import { useAuthStore } from "@/lib/auth-store";
import { toast } from "sonner";

/**
 * Syncs wallet connection state with the auth store.
 *
 * On wallet connect:
 *  - Check if the wallet is already registered (public lookup).
 *  - If registered: request a challenge, prompt wallet signature, and log in
 *    (obtaining JWT tokens).
 *  - If NOT registered: do nothing (the onboarding page handles registration).
 *
 * On wallet disconnect:
 *  - Clear all auth state (tokens + user).
 */
export function WalletSync() {
  const { address } = useAccount();
  const status = useStatus();
  const { signMessageAsync } = useSignMessage();
  const prevAddress = useRef<string | undefined>(undefined);

  const fetchUserByWallet = useAuthStore((s) => s.fetchUserByWallet);
  const requestChallenge = useAuthStore((s) => s.requestChallenge);
  const login = useAuthStore((s) => s.login);
  const logout = useAuthStore((s) => s.logout);
  const currentUser = useAuthStore((s) => s.user);
  const accessToken = useAuthStore((s) => s.accessToken);

  useEffect(() => {
    if (status === "connected" && address && address !== prevAddress.current) {
      prevAddress.current = address;

      // If we already have a valid session for this address, skip re-auth
      if (
        currentUser &&
        currentUser.wallet_address === address &&
        accessToken
      ) {
        return;
      }

      // Try to authenticate the connected wallet
      (async () => {
        try {
          const existingUser = await fetchUserByWallet(address);
          if (!existingUser) {
            // User not registered — onboarding page will handle it
            return;
          }

          // User exists — do challenge/sign/login flow
          const nonce = await requestChallenge(address);
          const { signature } = await signMessageAsync({ message: nonce });
          await login(address, signature, nonce);
        } catch (err) {
          // Don't toast for signature rejections (user cancelled)
          const msg = err instanceof Error ? err.message : "";
          if (
            !msg.includes("Cancelled") &&
            !msg.includes("cancel") &&
            !msg.includes("Rejected")
          ) {
            console.error("WalletSync: auth failed", err);
            toast.error("Failed to authenticate wallet. Please try again.");
          }
        }
      })();
    }

    if (status === "disconnected" && prevAddress.current) {
      prevAddress.current = undefined;
      logout();
    }
  }, [
    status,
    address,
    fetchUserByWallet,
    requestChallenge,
    login,
    logout,
    signMessageAsync,
    currentUser,
    accessToken,
  ]);

  return null;
}
