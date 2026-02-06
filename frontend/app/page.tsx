'use client';

import { useEffect, useMemo, useState } from 'react';
import { WalletButton } from '@/components/wallet';
import { Module } from '@/constants/modules';
import { StatsCards, ModulesList, LearningPanel, WelcomeScreen } from '@/components/learn';
import { UserRoleState, getUserRoleState } from '@/types/userRole';

export default function Home() {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [balance, setBalance] = useState<string>('0');
  const [modules, setModules] = useState<Module[]>([]);
  const [currentModule, setCurrentModule] = useState<string | null>(null);
  const [paidModules, setPaidModules] = useState<Set<string>>(new Set());
  const [completedModules] = useState<Set<string>>(new Set());
  const [payingModuleId, setPayingModuleId] = useState<string | null>(null);
  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<UserRoleState>('unknown');
  const [checkingRole, setCheckingRole] = useState(false);

  function handleWalletConnect(address: string, bal: string) {
    setWalletAddress(address);
    setBalance(bal);
  }

  useEffect(() => {
    if (!walletAddress) {
      setUserRole('unknown');
      return;
    }

    let abort = false;
    setCheckingRole(true);

    fetch(`/api/users?wallet_address=${encodeURIComponent(walletAddress)}`)
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) {
          throw new Error(body.error || 'Failed to fetch user');
        }
        if (abort) return;
        setUserRole(getUserRoleState(body.user?.role));
      })
      .catch(() => {
        if (abort) return;
        setUserRole('student');
      })
      .finally(() => {
        if (!abort) setCheckingRole(false);
      });

    return () => {
      abort = true;
    };
  }, [walletAddress]);

  // Load purchased courses when wallet connects
  useEffect(() => {
    if (!walletAddress) {
      setPaidModules(new Set());
      return;
    }

    let abort = false;

    fetch(`/api/purchases?wallet_address=${encodeURIComponent(walletAddress)}`)
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || 'Failed to load purchases');
        if (abort) return;
        setPaidModules(new Set(body.courseIds || []));
      })
      .catch((err) => {
        console.error('Failed to load purchases', err);
      });

    return () => {
      abort = true;
    };
  }, [walletAddress]);

  useEffect(() => {
    async function loadCourses() {
      try {
        const res = await fetch('/api/courses');
        const body = await res.json();
        if (!res.ok) throw new Error(body.error || 'Failed to load courses');
        const mapped: Module[] = (body.courses || []).map((c: any) => ({
          id: c.id,
          title: c.title,
          description: c.description,
          tuition: typeof c.cost === 'number' ? c.cost : 0,
        }));
        const limited = mapped.slice(0, 5);
        setModules(limited);
        setCurrentModule(limited.length ? limited[0].id : null);
      } catch (err) {
        console.error('Failed to load courses', err);
      }
    }
    loadCourses();
  }, []);

  // smol402 server URL
  const SMOL402_SERVER = process.env.NEXT_PUBLIC_SMOL402_SERVER || 'http://localhost:5402';

  async function handlePayModule(moduleId: string) {
    if (!walletAddress) {
      alert('Please connect wallet before paying.');
      return;
    }

    const module = modules.find((m) => m.id === moduleId);
    if (!module) return;

    try {
      setPaymentError(null);
      setPayingModuleId(moduleId);

      // Bước 1: Gọi smol402 server - sẽ trả về 402 nếu chưa thanh toán
      const res = await fetch(`${SMOL402_SERVER}/enroll/${moduleId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          walletAddress,
          courseCost: Math.floor(module.tuition * 1e10), // Convert to planck (10 decimals for PAS)
        }),
      });

      if (res.status === 402) {
        // Nhận 402 từ smol402 - cần thanh toán
        const data = await res.json();
        const paymentInfo = data.payment;

        console.log('🔴 402 Payment Required from smol402:', paymentInfo);
        console.log('📋 X-Payment-Required header:', res.headers.get('X-Payment-Required'));

        // Import sendPayment và thực hiện thanh toán
        const { sendPayment } = await import('@/lib/polkadot');
        
        // Gửi transaction thanh toán (amount đã là human-readable từ module.tuition)
        const paymentResult = await sendPayment(
          walletAddress,
          paymentInfo.recipient,
          module.tuition
        );

        console.log('✅ Payment sent:', paymentResult);

        // Bước 2: Gọi lại smol402 với payment proof (cả transactionHash và blockHash)
        const verifyRes = await fetch(`${SMOL402_SERVER}/enroll/${moduleId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            walletAddress,
            courseCost: Math.floor(module.tuition * 1e10),
            paymentProof: { 
              transactionHash: paymentResult.transactionHash,
              blockHash: paymentResult.blockHash 
            },
          }),
        });

        if (verifyRes.ok) {
          // Record purchase in database
          await fetch('/api/purchases', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              wallet_address: walletAddress,
              course_id: moduleId,
              price_paid: module.tuition,
              transaction_hash: paymentResult.transactionHash,
            }),
          });
          
          setPaidModules((prev) => new Set(prev).add(moduleId));
          console.log('✅ Enrolled successfully via smol402!');
        } else {
          const errBody = await verifyRes.json().catch(() => ({}));
          throw new Error(errBody.error || 'Failed to verify payment');
        }
        return;
      }

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Enrollment failed');
      }

      // Đã enroll trước đó
      setPaidModules((prev) => new Set(prev).add(moduleId));
    } catch (error) {
      console.error('Payment error:', error);
      setPaymentError((error as Error).message);
    } finally {
      setPayingModuleId(null);
    }
  }

  const selectedModule = modules.find((m) => m.id === currentModule);

  const tuitionPaid = useMemo(() => {
    return Array.from(paidModules).reduce((sum, id) => {
      const mod = modules.find((m) => m.id === id);
      return sum + (mod ? mod.tuition : 0);
    }, 0);
  }, [paidModules, modules]);

  const totalTuition = useMemo(
    () => modules.reduce((sum, m) => sum + (m.tuition || 0), 0),
    [modules],
  );

  return (
    <main className="min-h-screen bg-slate-950 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8 pb-6 border-b border-slate-800">
          <div>
            <p className="text-sm uppercase tracking-[0.16em] text-slate-400 mb-1">Notebook mode</p>
            <h1 className="text-4xl font-bold text-slate-50 mb-2">
              Learn & Earn 🎓
            </h1>
            <p className="text-slate-300">
              Master Polkadot
            </p>

            {walletAddress && (
              <div className="mt-4 space-y-2">
                <div className="text-sm text-slate-300">
                  {checkingRole && 'Checking role...'}
                  {!checkingRole && userRole === 'teacher' && 'Signed in as teacher.'}
                  {!checkingRole && userRole === 'student' && 'Current role: student.'}
                </div>

                {userRole === 'teacher' && (
                  <div className="flex flex-wrap gap-3">
                    <a
                      href="/teacher/create"
                      className="px-4 py-2 bg-slate-900 text-slate-50 rounded-xl border border-slate-700 hover:border-slate-500 transition-colors"
                    >
                      Create course
                    </a>
                    <a
                      href="/teacher/create?focus=lesson"
                      className="px-4 py-2 bg-slate-900 text-slate-50 rounded-xl border border-slate-700 hover:border-slate-500 transition-colors"
                    >
                      Create lesson
                    </a>
                    <a
                      href="/teacher/courses"
                      className="px-4 py-2 bg-slate-900 text-slate-50 rounded-xl border border-slate-700 hover:border-slate-500 transition-colors"
                    >
                      Created courses
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>
          <WalletButton onConnect={handleWalletConnect} />
        </div>

        {walletAddress ? (
          <>
            {/* Stats */}
            <StatsCards
              modulesCount={paidModules.size}
              totalModules={modules.length}
              tuitionPaid={tuitionPaid}
              totalTuition={totalTuition}
              balance={balance}
            />

            {/* Learning Interface */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Modules List */}
              <ModulesList
                modules={modules}
                currentModule={currentModule}
                paidModules={paidModules}
                completedModules={completedModules}
                onModuleSelect={(id) => setCurrentModule(id)}
              />

              {/* Learning Panel */}
              <div className="lg:col-span-2">
                <LearningPanel
                  module={selectedModule}
                  isPaid={!!selectedModule && paidModules.has(selectedModule.id)}
                  isPaymentProcessing={payingModuleId === selectedModule?.id}
                  walletAddress={walletAddress}
                  currentModule={currentModule}
                  onPayModule={() => selectedModule && handlePayModule(selectedModule.id)}
                  paymentError={paymentError}
                />
              </div>
            </div>
          </>
        ) : (
          /* Welcome Screen */
          <WelcomeScreen onConnect={handleWalletConnect} />
        )}
      </div>
    </main>
  );
}
