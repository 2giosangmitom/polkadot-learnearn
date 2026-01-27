'use client';

import { useState } from 'react';
import WalletButton from '@/components/WalletButton';
import ChatInterface from '@/components/ChatInterface';
import { MODULES, TOTAL_REWARDS, TOTAL_TUITION } from '@/lib/learningModules';
import { BookOpen, Trophy, Coins, CheckCircle2 } from 'lucide-react';

export default function Home() {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState<string>('0');
  const [currentModule, setCurrentModule] = useState(1);
  const [totalEarned, setTotalEarned] = useState(0);
  const [paidModules, setPaidModules] = useState<Set<number>>(new Set());
  const [completedModules, setCompletedModules] = useState<Set<number>>(new Set());
  const [payingModuleId, setPayingModuleId] = useState<number | null>(null);
  const [rewardProcessingId, setRewardProcessingId] = useState<number | null>(null);

  function handleWalletConnect(address: string, bal: string) {
    setWalletAddress(address);
    setBalance(bal);
  }

  const INSTRUCTOR_ADDRESS =
    process.env.NEXT_PUBLIC_INSTRUCTOR_ADDRESS || 'YOUR_INSTRUCTOR_ADDRESS';
  const SPONSOR_PAYOUT_ENDPOINT =
    process.env.NEXT_PUBLIC_SPONSOR_PAYOUT_ENDPOINT ||
    'http://localhost:3001/api/payout';

  async function handlePayModule(moduleId: number) {
    if (!walletAddress) {
      alert('Vui lòng kết nối ví trước khi thanh toán bài học.');
      return;
    }

    const module = MODULES.find((m) => m.id === moduleId);
    if (!module) return;

    try {
      setPayingModuleId(moduleId);

      // Import here to avoid SSR issues
      const { sendPayment } = await import('@/lib/polkadot');

      const txHash = await sendPayment(walletAddress, INSTRUCTOR_ADDRESS, module.tuition);
      console.log('✅ Tuition paid:', txHash);

      setPaidModules((prev) => {
        const next = new Set(prev);
        next.add(moduleId);
        return next;
      });
    } catch (error) {
      console.error('❌ Tuition payment failed:', error);
      alert(error instanceof Error ? error.message : 'Payment failed');
    } finally {
      setPayingModuleId(null);
    }
  }

  async function requestSponsorPayout(moduleId: number, amount: number, signature?: string) {
    if (!walletAddress) return;

    try {
      setRewardProcessingId(moduleId);

      const response = await fetch(SPONSOR_PAYOUT_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ moduleId, walletAddress, amount, signature }),
      });

      if (!response.ok) {
        throw new Error('Sponsor payout request failed');
      }

      const data = await response.json();
      console.log('✅ Sponsor payout processed:', data);
    } catch (error) {
      console.error('❌ Sponsor payout error:', error);
    } finally {
      setRewardProcessingId(null);
    }
  }

  async function handleRewardEarned(amount: number, signature: string) {
    setTotalEarned((prev) => prev + amount);
    console.log('🎉 Reward earned:', amount, 'WND', signature);

    setCompletedModules((prev) => {
      const next = new Set(prev);
      next.add(currentModule);
      return next;
    });

    await requestSponsorPayout(currentModule, amount, signature);

    if (currentModule < MODULES.length) {
      setTimeout(() => {
        setCurrentModule((prev) => prev + 1);
      }, 1200);
    }
  }

  const selectedModule = MODULES[currentModule - 1];
  const tuitionPaid = Array.from(paidModules).reduce((sum, id) => {
    const mod = MODULES.find((m) => m.id === id);
    return sum + (mod ? mod.tuition : 0);
  }, 0);

  return (
    <main className="min-h-screen bg-gradient-to-br from-rose-50 via-white to-rose-100 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold text-rose-900 mb-2">
              Learn & Earn 🎓
            </h1>
            <p className="text-rose-700">
              Master Polkadot & SMOL402, earn WND rewards
            </p>
          </div>
          <WalletButton onConnect={handleWalletConnect} />
        </div>

        {walletAddress && (
          <>
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
              <div className="bg-white rounded-xl p-6 shadow-md border border-rose-100">
                <div className="flex items-center gap-3">
                  <BookOpen className="w-8 h-8 text-[#e6007a]" />
                  <div>
                    <p className="text-sm text-rose-700">Modules unlocked</p>
                    <p className="text-2xl font-bold text-rose-900">
                      {paidModules.size} / {MODULES.length}
                    </p>
                    <p className="text-xs text-rose-600">
                      Tuition sent: {tuitionPaid.toFixed(2)} / {TOTAL_TUITION} WND
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-md border border-rose-100">
                <div className="flex items-center gap-3">
                  <Trophy className="w-8 h-8 text-[#e6007a]" />
                  <div>
                    <p className="text-sm text-rose-700">Sponsor rewards earned</p>
                    <p className="text-2xl font-bold text-rose-900">
                      {totalEarned.toFixed(2)} WND
                    </p>
                    <p className="text-xs text-rose-600">
                      Pool: {TOTAL_REWARDS} WND
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-6 shadow-md border border-rose-100">
                <div className="flex items-center gap-3">
                  <Coins className="w-8 h-8 text-[#e6007a]" />
                  <div>
                    <p className="text-sm text-rose-700">Wallet balance</p>
                    <p className="text-2xl font-bold text-rose-900">{balance} WND</p>
                    <p className="text-xs text-rose-600">
                      Rewards auto-sent via SMOL402
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Learning Interface */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Modules List */}
              <div className="bg-white rounded-xl p-6 shadow-lg border border-rose-100">
                <h3 className="text-xl font-bold text-rose-900 mb-4">Modules</h3>
                <div className="space-y-3">
                  {MODULES.map((module) => {
                    const isPaid = paidModules.has(module.id);
                    const isCompleted = completedModules.has(module.id);

                    return (
                      <div
                        key={module.id}
                        className={`p-4 rounded-lg border-2 cursor-pointer transition-all hover:-translate-y-[1px] ${
                          module.id === currentModule
                            ? 'border-[#e6007a] bg-rose-50'
                            : isCompleted
                            ? 'border-emerald-100 bg-white'
                            : isPaid
                            ? 'border-rose-200 bg-white'
                            : 'border-rose-100 bg-white'
                        }`}
                        onClick={() => setCurrentModule(module.id)}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h4 className="font-semibold text-rose-900">{module.title}</h4>
                            <p className="text-xs text-rose-600">Tuition: {module.tuition} WND</p>
                          </div>
                          {isCompleted ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                          ) : isPaid ? (
                            <span className="text-[11px] px-2 py-[2px] rounded-full bg-rose-100 text-rose-700 font-semibold">
                              Paid
                            </span>
                          ) : null}
                        </div>
                        <p className="text-sm text-rose-700">{module.description}</p>
                        <p className="text-xs text-[#e6007a] mt-2 font-medium">
                          Sponsor reward: {module.reward} WND
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Chat / Unlock Panel */}
              <div className="lg:col-span-2 space-y-4">
                <div className="bg-white rounded-xl p-6 shadow-lg border border-rose-100">
                  <h3 className="text-xl font-bold text-rose-900 mb-2">
                    {selectedModule?.title}
                  </h3>
                  <p className="text-rose-700 mb-4 leading-relaxed">
                    {selectedModule?.question}
                  </p>

                  {!selectedModule ? (
                    <p className="text-rose-700">Select a module to begin.</p>
                  ) : paidModules.has(selectedModule.id) ? (
                    <>
                      <div className="mb-4 text-sm text-rose-700 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        <span>
                          Tuition paid. Complete the lesson to receive the sponsor reward via SMOL402.
                        </span>
                      </div>
                      <ChatInterface
                        walletAddress={walletAddress}
                        currentModule={currentModule}
                        onRewardEarned={handleRewardEarned}
                      />
                      {rewardProcessingId === selectedModule.id && (
                        <p className="text-xs text-rose-600 mt-2">
                          Processing sponsor payout...
                        </p>
                      )}
                    </>
                  ) : (
                    <div className="border border-rose-100 rounded-xl p-6 bg-rose-50">
                      <p className="text-rose-800 font-semibold mb-2">
                        Unlock this lesson
                      </p>
                      <p className="text-sm text-rose-700 mb-4">
                        Pay {selectedModule.tuition} WND to the instructor. After completion, you receive {selectedModule.reward} WND from the Polkadot sponsor via SMOL402.
                      </p>
                      <button
                        onClick={() => handlePayModule(selectedModule.id)}
                        disabled={payingModuleId === selectedModule.id}
                        className="bg-[#e6007a] hover:bg-[#cc006c] text-white px-6 py-3 rounded-lg font-medium disabled:opacity-50 transition-colors shadow-sm"
                      >
                        {payingModuleId === selectedModule.id ? 'Processing...' : `Pay ${selectedModule.tuition} WND & unlock`}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Welcome Screen */}
        {!walletAddress && (
          <div className="bg-white rounded-xl p-12 shadow-xl border border-rose-100 text-center">
            <h2 className="text-3xl font-bold text-rose-900 mb-4">
              Welcome to Learn & Earn!  🚀
            </h2>
            <p className="text-lg text-rose-700 mb-8">
              Connect your Polkadot wallet to start learning and earning WND rewards
            </p>
            <div className="flex justify-center">
              <WalletButton onConnect={handleWalletConnect} />
            </div>
          </div>
        )}
      </div>
    </main>
  );
}