import { Module } from '@/constants/modules';

interface LearningPanelProps {
  module: Module | undefined;
  isPaid: boolean;
  isPaymentProcessing: boolean;
  walletAddress: string;
  currentModule: string | null;
  onPayModule: () => void;
  paymentError?: string | null;
}

export function LearningPanel({
  module,
  isPaid,
  isPaymentProcessing,
  walletAddress,
  currentModule,
  onPayModule,
  paymentError,
}: LearningPanelProps) {
  if (!module) {
    return (
      <div className="bg-slate-900 rounded-2xl p-6 shadow-lg border border-slate-800">
        <p className="text-slate-300">Select a course to begin.</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 rounded-2xl p-6 shadow-lg border border-slate-800">
      <h3 className="text-xl font-bold text-slate-50 mb-2 pb-3 border-b border-slate-800">
        {module.title}
      </h3>
      <p className="text-slate-200 mb-4 leading-relaxed">{module.description}</p>

      <div className="border border-slate-800 rounded-2xl p-6 bg-slate-950">
        <p className="text-sm text-slate-300 mb-3">
          Tuition: <span className="font-semibold text-slate-50">{module.tuition} PAS</span>
        </p>
        {typeof module.lessonsCount === 'number' && (
          <p className="text-xs text-slate-400 mb-3">Lessons: {module.lessonsCount}</p>
        )}
        <p className="text-xs text-slate-400 mb-4">
          Click to trigger HTTP 402 → smol402 payment → auto-enroll
        </p>
        <button
          onClick={onPayModule}
          disabled={isPaymentProcessing}
          className="px-6 py-3 rounded-xl bg-slate-100 text-slate-900 font-semibold hover:bg-white transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPaymentProcessing ? 'Processing payment...' : `Pay ${module.tuition} PAS to unlock`}
        </button>
        {paymentError && (
          <p className="text-xs text-red-300 mt-3">{paymentError}</p>
        )}
      </div>
    </div>
  );
}
