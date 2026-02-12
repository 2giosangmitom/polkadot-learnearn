'use client';

import React, { ReactNode, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { CoinIcon, WalletIcon } from '@/components/Icons';
import { Button } from '@/components/SharedUI';
import { useWallet } from '@/lib/hooks';
import { getUserRoleState, UserRoleState } from '@/types/userRole';

interface LayoutProps {
  children: ReactNode;
  userRole?: UserRoleState;
}

export const Layout: React.FC<LayoutProps> = ({ children, userRole: propUserRole }) => {
  const router = useRouter();
  const pathname = usePathname();
  const { address, isConnected, balance, disconnect } = useWallet();
  const [userRole, setUserRole] = useState<UserRoleState>(propUserRole || 'unknown');
  const [displayName, setDisplayName] = useState<string | null>(null);

  useEffect(() => {
    if (!isConnected || !address) {
      router.push('/pages/login');
      return;
    }

    let abort = false;

    async function fetchUserProfile() {
      try {
        const res = await fetch(`/api/users?wallet_address=${encodeURIComponent(address as string)}`);
        if (res.ok) {
          const data = await res.json();
          if (!abort && data?.user) {
            setUserRole(getUserRoleState(data.user.role));
            setDisplayName(data.user.display_name);
          }
        }
      } catch (err) {
        console.error('Failed to fetch user profile:', err);
      }
    }

    fetchUserProfile();

    return () => {
      abort = true;
    };
  }, [address, isConnected, router]);

  const handleLogout = async () => {
    await disconnect();
    router.push('/pages/landing');
  };

  const handleNavigate = (route: string) => {
    if (route === 'dashboard') {
      if (userRole === 'student') {
        router.push('/pages/student/dashboard');
      } else if (userRole === 'teacher') {
        router.push('/pages/teacher/courses');
      } else {
        router.push('/');
      }
    } else if (route === 'marketplace' && userRole === 'student') {
      router.push('/pages/student/course');
    }
  };

  // Helper function to check if a path is active
  const isActivePath = (path: string) => {
    return pathname?.startsWith(path);
  };

  // Get nav item classes with active state
  const getNavItemClasses = (path: string) => {
    const isActive = isActivePath(path);
    return `nav-item px-3 py-2 rounded-md font-medium transition-all ${
      isActive 
        ? 'bg-primary-500/10 text-primary-400 border border-primary-500/20' 
        : 'text-neutral-400 hover:text-white hover:bg-neutral-800/50'
    }`;
  };
  return (
    <div className="min-h-screen flex flex-col bg-neutral-950 text-white">
      <header className="bg-neutral-900/80 backdrop-blur-md border-b border-neutral-800 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-8">
              <div 
                className="logo-hover text-xl font-bold text-white cursor-pointer flex items-center space-x-2"
                onClick={() => handleNavigate('dashboard')}
              >
                <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg flex items-center justify-center shadow-lg shadow-primary-500/20">
                  <span className="text-white text-lg leading-none font-black">L</span>
                </div>
                <span>Learn<span className="text-primary-400">Web3</span></span>
              </div>
              
              <nav className="hidden md:flex space-x-2">
                <button 
                  onClick={() => handleNavigate('dashboard')}
                  className={getNavItemClasses(
                    userRole === 'student' ? '/pages/student/dashboard' : '/pages/teacher/courses'
                  )}
                >
                  Dashboard
                </button>
                {userRole === 'student' && (
                  <button 
                    onClick={() => handleNavigate('marketplace')}
                    className={getNavItemClasses('/pages/student/course')}
                  >
                    Courses
                  </button>
                )}
                {userRole === 'teacher' && (
                  <>
                    <button 
                      onClick={() => router.push('/pages/teacher/courses')}
                      className={getNavItemClasses('/pages/teacher/courses')}
                    >
                      My Courses
                    </button>
                    <button 
                      onClick={() => router.push('/pages/teacher/create')}
                      className={getNavItemClasses('/pages/teacher/create')}
                    >
                      Create Course
                    </button>
                  </>
                )}
              </nav>
            </div>

            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-1.5 bg-indigo-900/30 text-indigo-300 border border-indigo-500/20 px-3 py-1.5 rounded-full font-medium text-sm">
                <WalletIcon className="w-4 h-4" />
                <span>{balance || '0'} PAS</span>
              </div>
              
              <div className="flex items-center space-x-2 text-sm text-neutral-400 border border-neutral-800 bg-neutral-900 px-3 py-1.5 rounded-md hidden sm:flex">
                {displayName && <span className="font-medium text-neutral-300">{displayName}</span>}
                <span className="truncate w-24 font-mono text-neutral-500">
                  {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : ''}
                </span>
              </div>

              <Button variant="outline" onClick={handleLogout} className="text-sm hover:text-white">
                Disconnect
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
};
