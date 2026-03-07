"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User, Role } from "@/lib/api";
import { usersApi, ApiError } from "@/lib/api";

interface UserState {
  user: User | null;
  isLoading: boolean;
  error: string | null;

  /** Look up (or discover there's no) backend user for a wallet address */
  fetchUser: (walletAddress: string) => Promise<User | null>;

  /** Register a brand new user */
  register: (
    walletAddress: string,
    displayName: string,
    role: Role
  ) => Promise<User>;

  /** Update display name only */
  updateDisplayName: (newName: string) => Promise<void>;

  /** Clear local state (disconnect) */
  clear: () => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      user: null,
      isLoading: false,
      error: null,

      fetchUser: async (walletAddress: string) => {
        set({ isLoading: true, error: null });
        try {
          const user = await usersApi.getByWallet(walletAddress);
          set({ user, isLoading: false });
          return user;
        } catch (err) {
          if (err instanceof ApiError && err.status === 404) {
            set({ user: null, isLoading: false });
            return null;
          }
          set({
            error: err instanceof Error ? err.message : "Unknown error",
            isLoading: false,
          });
          return null;
        }
      },

      register: async (walletAddress, displayName, role) => {
        set({ isLoading: true, error: null });
        try {
          const user = await usersApi.create({
            wallet_address: walletAddress,
            display_name: displayName,
            role,
          });
          set({ user, isLoading: false });
          return user;
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Registration failed";
          set({ error: msg, isLoading: false });
          throw err;
        }
      },

      updateDisplayName: async (newName) => {
        const currentUser = get().user;
        if (!currentUser) return;
        set({ isLoading: true, error: null });
        try {
          const updated = await usersApi.update(currentUser.id, {
            display_name: newName,
          });
          set({ user: updated, isLoading: false });
        } catch (err) {
          set({
            error: err instanceof Error ? err.message : "Update failed",
            isLoading: false,
          });
        }
      },

      clear: () => set({ user: null, isLoading: false, error: null }),
    }),
    {
      name: "polkadot-learnearn-user",
      partialize: (state) => ({ user: state.user }),
    }
  )
);
