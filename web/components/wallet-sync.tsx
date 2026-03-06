"use client";

import { useEffect, useRef } from "react";
import { useAccount, useStatus } from "@luno-kit/react";
import { useUserStore } from "@/lib/user-store";

/**
 * Syncs wallet connection state with our user store.
 * When a wallet connects, tries to fetch the backend user.
 * When a wallet disconnects, clears local user state.
 */
export function WalletSync() {
  const { address } = useAccount();
  const status = useStatus();
  const fetchUser = useUserStore((s) => s.fetchUser);
  const clear = useUserStore((s) => s.clear);
  const prevAddress = useRef<string | undefined>(undefined);

  useEffect(() => {
    if (status === "connected" && address && address !== prevAddress.current) {
      prevAddress.current = address;
      fetchUser(address);
    }
    if (status === "disconnected" && prevAddress.current) {
      prevAddress.current = undefined;
      clear();
    }
  }, [status, address, fetchUser, clear]);

  return null;
}
