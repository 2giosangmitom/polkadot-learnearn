"use client";

import { create } from "zustand";
import type { X402PaymentRequired, PaymentProof } from "@/lib/api";

// ---------------------------------------------------------------------------
// x402 payment agent — manages the 402 payment dialog lifecycle
//
// When the API client encounters a 402 with a PAYMENT-REQUIRED header,
// it calls `requestPayment(info)`. This opens a dialog and returns a
// Promise<PaymentProof | null> that resolves when the user completes
// or cancels payment.
// ---------------------------------------------------------------------------

interface PaymentRequest {
  info: X402PaymentRequired;
  resolve: (proof: PaymentProof | null) => void;
}

interface X402State {
  /** The currently pending payment request (shown in the dialog) */
  pendingPayment: PaymentRequest | null;

  /** Whether the dialog is open */
  isOpen: boolean;

  /**
   * Called by the API client when a 402 is received.
   * Opens the payment dialog and returns a promise that resolves
   * with a PaymentProof (on-chain tx proof) or null (cancelled).
   */
  requestPayment: (info: X402PaymentRequired) => Promise<PaymentProof | null>;

  /**
   * Called by the dialog component when payment succeeds.
   * Passes the on-chain transaction proof back to the API client.
   */
  resolvePayment: (proof: PaymentProof) => void;

  /**
   * Called by the dialog component when the user closes / cancels.
   */
  cancelPayment: () => void;
}

export const useX402Store = create<X402State>()((set, get) => ({
  pendingPayment: null,
  isOpen: false,

  requestPayment: (info: X402PaymentRequired) => {
    return new Promise<PaymentProof | null>((resolve) => {
      set({
        pendingPayment: { info, resolve },
        isOpen: true,
      });
    });
  },

  resolvePayment: (proof: PaymentProof) => {
    const { pendingPayment } = get();
    if (pendingPayment) {
      pendingPayment.resolve(proof);
    }
    set({ pendingPayment: null, isOpen: false });
  },

  cancelPayment: () => {
    const { pendingPayment } = get();
    if (pendingPayment) {
      pendingPayment.resolve(null);
    }
    set({ pendingPayment: null, isOpen: false });
  },
}));
