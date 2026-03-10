"use client";

import { create } from "zustand";
import type { PaymentRequiredInfo } from "@/lib/api";

// ---------------------------------------------------------------------------
// x402 payment agent — manages the 402 payment dialog lifecycle
//
// When the API client encounters a 402, it calls `requestPayment(info)`.
// This opens a dialog and returns a Promise<boolean> that resolves when
// the user completes or cancels payment.
// ---------------------------------------------------------------------------

interface PaymentRequest {
  info: PaymentRequiredInfo;
  resolve: (paid: boolean) => void;
}

interface X402State {
  /** The currently pending payment request (shown in the dialog) */
  pendingPayment: PaymentRequest | null;

  /** Whether the dialog is open */
  isOpen: boolean;

  /**
   * Called by the API client when a 402 is received.
   * Opens the payment dialog and returns a promise that resolves
   * when the user completes or cancels payment.
   */
  requestPayment: (info: PaymentRequiredInfo) => Promise<boolean>;

  /**
   * Called by the dialog component when payment succeeds.
   */
  resolvePayment: (paid: boolean) => void;

  /**
   * Called by the dialog component when the user closes / cancels.
   */
  cancelPayment: () => void;
}

export const useX402Store = create<X402State>()((set, get) => ({
  pendingPayment: null,
  isOpen: false,

  requestPayment: (info: PaymentRequiredInfo) => {
    return new Promise<boolean>((resolve) => {
      set({
        pendingPayment: { info, resolve },
        isOpen: true,
      });
    });
  },

  resolvePayment: (paid: boolean) => {
    const { pendingPayment } = get();
    if (pendingPayment) {
      pendingPayment.resolve(paid);
    }
    set({ pendingPayment: null, isOpen: false });
  },

  cancelPayment: () => {
    const { pendingPayment } = get();
    if (pendingPayment) {
      pendingPayment.resolve(false);
    }
    set({ pendingPayment: null, isOpen: false });
  },
}));
