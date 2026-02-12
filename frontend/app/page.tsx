'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to landing page (will handle login/dashboard routing)
    router.push('/pages/landing');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0d0f15]">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#e6007a] mx-auto mb-4"></div>
        <p className="text-[#9ca3af]">Loading...</p>
      </div>
    </div>
  );
}
