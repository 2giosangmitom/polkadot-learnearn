"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User, Role } from "@/lib/api";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AuthTokens {
  access_token: string;
  refresh_token: string;
}

interface AuthResponse {
  tokens: AuthTokens;
  user: User;
}

interface AuthState {
  // State
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  /** Request a challenge nonce from the backend for wallet signature auth */
  requestChallenge: (address: string) => Promise<string>;

  /** Login with a signed challenge (existing user) */
  login: (address: string, signature: string, message: string) => Promise<User>;

  /** Register + login with a signed challenge (new user) */
  register: (
    address: string,
    signature: string,
    message: string,
    displayName: string,
    role: Role,
  ) => Promise<User>;

  /** Refresh tokens using the current refresh token */
  refresh: () => Promise<void>;

  /** Look up a user by wallet (public, no auth needed) — returns null if not found */
  fetchUserByWallet: (address: string) => Promise<User | null>;

  /** Update display name for the current user */
  updateDisplayName: (newName: string) => Promise<void>;

  /** Clear all auth state (logout / disconnect) */
  logout: () => void;

  /** Get the current access token (for use by api.ts) */
  getAccessToken: () => string | null;
}

// ---------------------------------------------------------------------------
// API base
// ---------------------------------------------------------------------------

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, init);
  if (!res.ok) {
    const body = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(body.detail ?? res.statusText);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

function jsonBody(body: unknown): RequestInit {
  return {
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isLoading: false,
      error: null,

      getAccessToken: () => get().accessToken,

      requestChallenge: async (address: string) => {
        const res = await apiFetch<{ nonce: string }>("/auth/challenge", {
          method: "POST",
          ...jsonBody({ address }),
        });
        return res.nonce;
      },

      login: async (address, signature, message) => {
        set({ isLoading: true, error: null });
        try {
          const res = await apiFetch<AuthResponse>("/auth/login", {
            method: "POST",
            ...jsonBody({ address, signature, message }),
          });
          set({
            user: res.user,
            accessToken: res.tokens.access_token,
            refreshToken: res.tokens.refresh_token,
            isLoading: false,
          });
          return res.user;
        } catch (err) {
          const msg = err instanceof Error ? err.message : "Login failed";
          set({ error: msg, isLoading: false });
          throw err;
        }
      },

      register: async (address, signature, message, displayName, role) => {
        set({ isLoading: true, error: null });
        try {
          const res = await apiFetch<AuthResponse>("/auth/register", {
            method: "POST",
            ...jsonBody({
              address,
              signature,
              message,
              display_name: displayName,
              role,
            }),
          });
          set({
            user: res.user,
            accessToken: res.tokens.access_token,
            refreshToken: res.tokens.refresh_token,
            isLoading: false,
          });
          return res.user;
        } catch (err) {
          const msg =
            err instanceof Error ? err.message : "Registration failed";
          set({ error: msg, isLoading: false });
          throw err;
        }
      },

      refresh: async () => {
        const { refreshToken } = get();
        if (!refreshToken) {
          set({ user: null, accessToken: null, refreshToken: null });
          return;
        }
        try {
          const res = await apiFetch<{
            access_token: string;
            refresh_token: string;
          }>("/auth/refresh", {
            method: "POST",
            ...jsonBody({ refresh_token: refreshToken }),
          });
          set({
            accessToken: res.access_token,
            refreshToken: res.refresh_token,
          });
        } catch {
          // Refresh failed — clear auth state
          set({ user: null, accessToken: null, refreshToken: null });
        }
      },

      fetchUserByWallet: async (address: string) => {
        try {
          const user = await apiFetch<User>(
            `/users/wallet/${encodeURIComponent(address)}`,
          );
          return user;
        } catch {
          return null;
        }
      },

      updateDisplayName: async (newName: string) => {
        const { user, accessToken } = get();
        if (!user || !accessToken) return;
        set({ isLoading: true, error: null });
        try {
          const updated = await apiFetch<User>(`/users/${user.id}`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({ display_name: newName }),
          });
          set({ user: updated, isLoading: false });
        } catch (err) {
          set({
            error: err instanceof Error ? err.message : "Update failed",
            isLoading: false,
          });
        }
      },

      logout: () =>
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isLoading: false,
          error: null,
        }),
    }),
    {
      name: "polkadot-learnearn-auth",
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
      }),
    },
  ),
);
