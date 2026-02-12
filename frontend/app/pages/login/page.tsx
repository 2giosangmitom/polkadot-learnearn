'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, Button } from '@/components/SharedUI';
import { WalletButton } from '@/components/wallet';
import { useWallet } from '@/lib/hooks';
import { BookOpen, GraduationCap, Sparkles } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { address, isConnected } = useWallet();
  const [selectedRole, setSelectedRole] = useState<'student' | 'teacher' | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Check if user already has a role set (optional: auto-redirect)
  // Commented out to prevent auto-redirect on wallet connect
  // useEffect(() => {
  //   if (!isConnected || !address) return;

  //   let aborted = false;
  //   setCheckingExistingUser(true);

  //   async function checkUser() {
  //     try {
  //       const res = await fetch(`/api/users?wallet_address=${encodeURIComponent(address as string)}`);
        
  //       if (!res.ok) {
  //         setCheckingExistingUser(false);
  //         return;
  //       }

  //       const data = await res.json();
  //       const user = data?.user;

  //       if (!aborted && user && user.role) {
  //         const role = getUserRoleState(user.role);
  //         if (role === 'teacher') {
  //           router.push('/pages/teacher/courses');
  //         } else {
  //           router.push('/pages/student/courses');
  //         }
  //       } else {
  //         setCheckingExistingUser(false);
  //       }
  //     } catch (error) {
  //       console.error('Error checking user:', error);
  //       setCheckingExistingUser(false);
  //     }
  //   }

  //   checkUser();

  //   return () => {
  //     aborted = true;
  //   };
  // }, [address, isConnected, router]);

  const handleContinue = async () => {
    if (!isConnected || !address || !selectedRole) return;

    setIsLoading(true);
    try {
      // Create or update user with selected role
      const roleValue = selectedRole === 'teacher' ? 2 : 1;
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet_address: address,
          role: roleValue,
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to save user profile');
      }

      // Redirect based on role
      if (selectedRole === 'teacher') {
        router.push('/pages/teacher/courses');
      } else {
        router.push('/pages/student/dashboard');
      }
    } catch (error) {
      console.error('Error:', error);
      alert('Failed to continue. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 relative overflow-hidden flex flex-col items-center justify-center px-4">
      {/* Background Blobs */}
      <div className="absolute top-0 -left-4 w-72 h-72 bg-indigo-600 rounded-full mix-blend-screen filter blur-[100px] opacity-20 animate-blob"></div>
      <div className="absolute -bottom-8 right-20 w-72 h-72 bg-indigo-600 rounded-full mix-blend-screen filter blur-[100px] opacity-20 animate-blob animation-delay-4000"></div>

      <div className="relative z-10 w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-6">
            <Sparkles className="w-8 h-8 text-indigo-400" />
            <h1 className="text-4xl font-extrabold bg-gradient-to-r from-indigo-400 to-indigo-300 bg-clip-text text-transparent">
              Learn & Earn
            </h1>
          </div>
          <h2 className="text-3xl font-extrabold text-white mb-2">Welcome Back</h2>
          <p className="text-neutral-400">
            Connect your wallet to get started
          </p>
        </div>

        {/* Login Card */}
        <Card className="p-8">
          <div className="space-y-6">
            {/* Wallet Connection */}
            <div>
              <label className="block text-sm font-medium text-neutral-300 mb-3">
                Step 1: Connect Your Wallet
              </label>
              <div className="flex justify-center">
                <WalletButton className="!px-8 !py-3" onConnect={() => {}} />
              </div>
            </div>

            {/* Role Selection - Show only when wallet is connected */}
            {isConnected && (
              <>
                <div className="border-t border-neutral-800 pt-6">
                  <label className="block text-sm font-medium text-neutral-300 mb-4">
                    Step 2: Choose Your Role
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => setSelectedRole('student')}
                      className={`p-6 rounded-xl border-2 transition-all ${
                        selectedRole === 'student'
                          ? 'border-indigo-500 bg-indigo-500/10'
                          : 'border-neutral-700 bg-neutral-900/50 hover:border-neutral-600'
                      }`}
                    >
                      <BookOpen className={`w-8 h-8 mx-auto mb-3 ${
                        selectedRole === 'student' ? 'text-indigo-400' : 'text-neutral-500'
                      }`} />
                      <div className={`font-semibold mb-1 ${
                        selectedRole === 'student' ? 'text-indigo-300' : 'text-neutral-300'
                      }`}>
                        Student
                      </div>
                      <p className="text-xs text-neutral-500">
                        Learn courses and earn rewards
                      </p>
                    </button>

                    <button
                      onClick={() => setSelectedRole('teacher')}
                      className={`p-6 rounded-xl border-2 transition-all ${
                        selectedRole === 'teacher'
                          ? 'border-indigo-500 bg-indigo-500/10'
                          : 'border-neutral-700 bg-neutral-900/50 hover:border-neutral-600'
                      }`}
                    >
                      <GraduationCap className={`w-8 h-8 mx-auto mb-3 ${
                        selectedRole === 'teacher' ? 'text-indigo-400' : 'text-neutral-500'
                      }`} />
                      <div className={`font-semibold mb-1 ${
                        selectedRole === 'teacher' ? 'text-indigo-300' : 'text-neutral-300'
                      }`}>
                        Teacher
                      </div>
                      <p className="text-xs text-neutral-500">
                        Create courses and grade students
                      </p>
                    </button>
                  </div>

                  {/* Role Description */}
                  {selectedRole && (
                    <div className="mt-4 p-4 bg-neutral-900/50 rounded-lg border border-neutral-800">
                      <p className="text-sm text-neutral-300">
                        {selectedRole === 'student'
                          ? '🎓 As a student, you can enroll in courses, complete milestones, and earn PAS tokens for your achievements.'
                          : '👨‍🏫 As a teacher, you can create courses, set pricing, grade student submissions, and earn from course enrollments.'}
                      </p>
                    </div>
                  )}
                </div>

                {/* Continue Button */}
                <Button
                  onClick={handleContinue}
                  disabled={!selectedRole || isLoading}
                  className="w-full py-3 font-bold"
                >
                  {isLoading ? 'Loading...' : 'Continue'}
                </Button>
              </>
            )}
          </div>
        </Card>

        {/* Footer */}
        <div className="mt-6 text-center text-sm text-neutral-500">
          <p>
            New here?{' '}
            <a href="/pages/landing" className="text-indigo-400 hover:text-indigo-300 font-medium">
              Learn more about the platform
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
