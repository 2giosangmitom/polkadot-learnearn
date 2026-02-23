'use client';

import React, { useEffect, useCallback } from 'react';

export type ModalType = 'success' | 'error' | 'warning' | 'info';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  message: string;
  type?: ModalType;
  confirmText?: string;
  showCancel?: boolean;
  cancelText?: string;
  onConfirm?: () => void;
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  message,
  type = 'info',
  confirmText = 'OK',
  showCancel = false,
  cancelText = 'Cancel',
  onConfirm,
}) => {
  // Close modal when ESC is pressed
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    }
    onClose();
  };

  // Icon by type with unified color
  const getTypeIcon = () => {
    switch (type) {
      case 'success':
        return (
          <svg className="w-14 h-14 text-[#e5e7eb]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'error':
        return (
          <svg className="w-14 h-14 text-[#e5e7eb]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'warning':
        return (
          <svg className="w-14 h-14 text-[#e5e7eb]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        );
      default: // info
        return (
          <svg className="w-14 h-14 text-[#e5e7eb]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fadeIn"
      onClick={onClose}
    >
      <div 
        className="relative bg-[#0f1117]/90 backdrop-blur-xl rounded-lg shadow-2xl max-w-md w-full transform transition-all animate-slideUp border border-[#1f2430]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Gradient overlay for glass effect */}
        <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-white/5 to-transparent pointer-events-none"></div>
        
        <div className="relative p-8">
          {/* Icon with animated background */}
          <div className="flex justify-center mb-6">
            <div className="relative bg-[#1a1d26] rounded-lg p-4">
              {getTypeIcon()}
            </div>
          </div>

          {/* Title */}
          {title && (
            <h3 className="text-2xl font-bold text-[#e5e7eb] text-center mb-3">
              {title}
            </h3>
          )}

          {/* Message */}
          <p className="text-[#9ca3af] text-center mb-8 whitespace-pre-line leading-relaxed">
            {message}
          </p>

          {/* Buttons */}
          <div className="flex gap-3">
            {showCancel && (
              <button
                onClick={onClose}
                className="flex-1 px-5 py-3 text-[#e5e7eb] bg-[#1a1d26] border border-[#1f2430] rounded-lg hover:bg-[#252930] hover:border-[#2f3440] transition-all font-medium"
              >
                {cancelText}
              </button>
            )}
            <button
              onClick={handleConfirm}
              className="flex-1 px-5 py-3 text-white bg-[#e6007a] rounded-lg hover:bg-[#cc006c] transition-all font-medium shadow-lg"
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Modal;

// Hook to use modal more easily
export const useModal = () => {
  const [modalState, setModalState] = React.useState<{
    isOpen: boolean;
    title?: string;
    message: string;
    type: ModalType;
    confirmText?: string;
    showCancel?: boolean;
    cancelText?: string;
    onConfirm?: () => void;
  }>({
    isOpen: false,
    message: '',
    type: 'info',
  });

  const showModal = useCallback((
    message: string,
    options?: {
      title?: string;
      type?: ModalType;
      confirmText?: string;
      showCancel?: boolean;
      cancelText?: string;
      onConfirm?: () => void;
    }
  ) => {
    setModalState({
      isOpen: true,
      message,
      type: options?.type || 'info',
      title: options?.title,
      confirmText: options?.confirmText,
      showCancel: options?.showCancel,
      cancelText: options?.cancelText,
      onConfirm: options?.onConfirm,
    });
  }, []);

  const hideModal = useCallback(() => {
    setModalState((prev) => ({ ...prev, isOpen: false }));
  }, []);

  return {
    modalState,
    showModal,
    hideModal,
  };
};
