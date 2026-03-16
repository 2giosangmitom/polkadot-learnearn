"use client";

import { useState } from "react";
import { useApi, useBalance, useAccount } from "@luno-kit/react";
import { useSendTransaction } from "@luno-kit/react";
import { useX402Store } from "@/lib/x402";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Coins,
  Loader2,
  ShieldCheck,
  BookOpen,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

/**
 * Global dialog that handles x402 Payment Required responses.
 *
 * When the x402 agent detects a 402 with a PAYMENT-REQUIRED header,
 * it opens this dialog showing the course name, price, and payment action.
 * The user confirms, sends PAS to the platform wallet, and the dialog
 * resolves with {transactionHash, blockHash}. The API client then
 * retries the original request with a PAYMENT-SIGNATURE header containing
 * this proof, and the server verifies + settles.
 */
export function X402PaymentDialog() {
  const { address } = useAccount();
  const { api, isApiReady } = useApi();
  const { data: balance } = useBalance({ address });
  const {
    sendTransactionAsync,
    isPending: isSending,
    txStatus,
  } = useSendTransaction({ waitFor: "inBlock" });

  const pendingPayment = useX402Store((s) => s.pendingPayment);
  const isOpen = useX402Store((s) => s.isOpen);
  const resolvePayment = useX402Store((s) => s.resolvePayment);
  const cancelPayment = useX402Store((s) => s.cancelPayment);

  const [processing, setProcessing] = useState(false);

  if (!pendingPayment) return null;

  const { info } = pendingPayment;
  // Read payment details from the first accepted option
  const option = info.accepts[0];
  if (!option) return null;

  const courseTitle = option.extra?.courseTitle ?? "this course";
  const price = option.extra?.price ?? 0;
  const payTo = option.payTo;

  const insufficientBalance =
    balance && parseFloat(balance.formattedTransferable) < price;

  async function handlePurchase() {
    if (!api || !isApiReady || !address) {
      toast.error("Wallet not ready. Please try again.");
      return;
    }

    if (insufficientBalance) {
      toast.error(
        `Insufficient balance. You have ${balance?.formattedTransferable} PAS but need ${price} PAS.`,
      );
      return;
    }

    setProcessing(true);
    try {
      // Convert price to planck (1 token = 10^10 planck on Paseo)
      const amountInPlanck = BigInt(option.maxAmountRequired);

      toast.info("Please confirm the transaction in your wallet...");

      // Send PAS to the PLATFORM wallet (not the teacher)
      const tx = api.tx.balances.transferKeepAlive(payTo, amountInPlanck);

      const receipt = await sendTransactionAsync({ extrinsic: tx });

      if (receipt.status === "failed") {
        toast.error(
          "Transaction failed on-chain. Your funds were not transferred.",
        );
        setProcessing(false);
        return;
      }

      toast.success("Transaction confirmed! Verifying with the server...");

      setProcessing(false);

      // Resolve with on-chain proof — the API client will retry with
      // PAYMENT-SIGNATURE header and the server will verify + settle
      resolvePayment({
        transactionHash: receipt.transactionHash,
        blockHash: receipt.blockHash,
      });
    } catch (err) {
      setProcessing(false);
      const message =
        err instanceof Error
          ? err.message
          : "Purchase failed. Please try again.";
      if (message.includes("Cancelled") || message.includes("cancel")) {
        toast.warning("Transaction cancelled.");
      } else {
        toast.error(message);
      }
    }
  }

  return (
    <AlertDialog
      open={isOpen}
      onOpenChange={(open) => !open && cancelPayment()}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Coins className="h-5 w-5 text-primary" />
            Purchase Required
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <p>
                To access this content, you need to purchase{" "}
                <strong className="text-foreground">{courseTitle}</strong>.
              </p>

              <div className="rounded-lg border p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Price</span>
                  <Badge
                    variant="secondary"
                    className="gap-1.5 bg-primary/10 text-primary text-base px-3 py-1"
                  >
                    <Coins className="h-4 w-4" />
                    {price} PAS
                  </Badge>
                </div>
                {balance && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Your balance
                    </span>
                    <span
                      className={`text-sm font-medium ${insufficientBalance ? "text-destructive" : "text-foreground"}`}
                    >
                      {balance.formattedTransferable} PAS
                    </span>
                  </div>
                )}
              </div>

              {insufficientBalance && (
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <AlertTriangle className="h-4 w-4 shrink-0" />
                  Insufficient balance to complete this purchase.
                </div>
              )}

              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-primary shrink-0" />
                  On-chain payment verification via x402
                </div>
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-primary shrink-0" />
                  Instant access after payment
                </div>
                <div className="flex items-center gap-2">
                  <Coins className="h-4 w-4 text-primary shrink-0" />
                  Earn PAS back by completing quizzes
                </div>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <Button
            variant="outline"
            onClick={cancelPayment}
            disabled={processing || isSending}
          >
            Cancel
          </Button>
          <Button
            onClick={handlePurchase}
            disabled={
              processing ||
              isSending ||
              !isApiReady ||
              !address ||
              !!insufficientBalance
            }
          >
            {processing || isSending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {txStatus === "signing"
                  ? "Confirm in wallet..."
                  : txStatus === "pending"
                    ? "Waiting for block..."
                    : "Processing..."}
              </>
            ) : (
              <>
                <Coins className="mr-2 h-4 w-4" />
                Pay {price} PAS
              </>
            )}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
