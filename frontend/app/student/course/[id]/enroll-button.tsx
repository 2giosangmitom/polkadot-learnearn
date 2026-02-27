'use client';

import { useState } from 'react';
import { useWallet } from '@/lib/hooks';
import { sendPayment } from '@/lib/polkadot';
import { Button } from '@/components/SharedUI';
import Modal, { useModal } from '@/components/Modal';

interface EnrollButtonProps {
  courseId: string;
  courseTitle: string;
  cost: number;
  recipientWallet: string;
  onEnrollSuccess?: () => void;
}

export function EnrollButton({
  courseId,
  courseTitle,
  cost,
  recipientWallet,
  onEnrollSuccess,
}: EnrollButtonProps) {
  const { address, isConnected } = useWallet();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { modalState, showModal, hideModal } = useModal();

  const handleEnroll = async () => {
    if (!isConnected || !address) {
      showModal('Please connect your wallet first.', {
        type: 'warning',
        title: 'Wallet Not Connected'
      });
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      // First enrollment attempt without payment proof
      const res = await fetch(`/api/courses/${courseId}/enroll`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          walletAddress: address,
        }),
      });

      // Handle 402 Payment Required
      if (res.status === 402) {
        const data = await res.json();
        const paymentInfo = data.payment;

        console.log('🔴 402 Payment Required:', paymentInfo);
        console.log('📋 X-Payment-Required header:', res.headers.get('X-Payment-Required'));

        if (!paymentInfo || !paymentInfo.recipient) {
          throw new Error('Invalid payment information received from server');
        }

        // Send payment via Polkadot
        const paymentResult = await sendPayment(
          address,
          paymentInfo.recipient,
          cost
        );

        console.log('✅ Payment sent:', paymentResult);

        // Verify enrollment with payment proof
        const verifyRes = await fetch(`/api/courses/${courseId}/enroll`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            walletAddress: address,
            paymentProof: {
              transactionHash: paymentResult.transactionHash,
              blockHash: paymentResult.blockHash,
            },
          }),
        });

        if (verifyRes.ok) {
          const verifyData = await verifyRes.json();
          if (verifyData.success) {
            console.log('✅ Enrolled successfully!');
            showModal('Course enrollment successful!', {
              type: 'success',
              title: 'Success',
              onConfirm: () => {
                onEnrollSuccess?.();
              }
            });
            return;
          }
        }

        const errBody = await verifyRes.json().catch(() => ({}));
        throw new Error(errBody.error || 'Failed to verify payment');
      }

      // Handle other responses
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Enrollment failed');
      }

      // Success (already enrolled or free course)
      const data = await res.json();
      if (data.success) {
        console.log('✅ Enrolled successfully!');
        showModal('Course enrollment successful!', {
          type: 'success',
          title: 'Success',
          onConfirm: () => {
            onEnrollSuccess?.();
          }
        });
      }
    } catch (error) {
      console.error('Enrollment error:', error);
      const errorMsg = (error as Error).message;
      setError(errorMsg);
      showModal(errorMsg, {
        type: 'error',
        title: 'Enrollment Error'
      });
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-2">
      <Button
        onClick={handleEnroll}
        disabled={processing || !isConnected}
        className="w-full py-3"
      >
        {processing ? 'Processing...' : `Enroll Now - ${cost} PAS`}
      </Button>
      {error && (
        <div className="text-sm text-red-400 text-center">
          {error}
        </div>
      )}

      <Modal
        isOpen={modalState.isOpen}
        onClose={hideModal}
        message={modalState.message}
        title={modalState.title}
        type={modalState.type}
        confirmText={modalState.confirmText}
        showCancel={modalState.showCancel}
        cancelText={modalState.cancelText}
        onConfirm={modalState.onConfirm}
      />
    </div>
  );
}
