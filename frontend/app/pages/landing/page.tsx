'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/SharedUI';
import { BookOpen, Award, Users } from 'lucide-react';

export default function Landing() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-neutral-950 relative overflow-hidden flex flex-col items-center justify-center text-center">
      {/* Animated Background Blobs */}
      <div className="absolute top-0 -left-4 w-72 h-72 bg-indigo-600 rounded-full mix-blend-screen filter blur-[100px] opacity-20 animate-blob"></div>
      <div className="absolute top-0 -right-4 w-72 h-72 bg-indigo-600 rounded-full mix-blend-screen filter blur-[100px] opacity-20 animate-blob animation-delay-2000"></div>
      <div className="absolute -bottom-8 left-20 w-72 h-72 bg-purple-600 rounded-full mix-blend-screen filter blur-[100px] opacity-20 animate-blob animation-delay-4000"></div>

      <div className="relative z-10 max-w-4xl px-4 sm:px-6 lg:px-8 flex flex-col items-center">
        {/* Logo/Badge */}
        <div className="animate-fade-in-up flex items-center space-x-2 bg-neutral-900/50 backdrop-blur-md border border-neutral-800 rounded-full px-4 py-2 mb-8">
          <span className="relative flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75 animate-ping"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-indigo-500"></span>
          </span>
          <span className="text-sm font-medium text-neutral-300">
            Decentralized AI Learning Platform
          </span>
        </div>

        {/* Hero Text */}
        <h1 className="animate-fade-in-up delay-100 text-5xl md:text-7xl font-extrabold tracking-tight text-white mb-6">
          Master Web3. <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-indigo-300">
            Earn While You Learn.
          </span>
        </h1>

        <p className="animate-fade-in-up delay-200 mt-4 max-w-2xl text-lg md:text-xl text-neutral-400 mb-10">
          Join the next generation of education. Complete AI-evaluated milestones,
          prove your knowledge, and earn PAS tokens directly to your wallet.
        </p>

        {/* CTA Buttons */}
        <div className="animate-fade-in-up delay-300 flex flex-col sm:flex-row gap-4 mb-16">
          <Button
            onClick={() => router.push('/pages/login')}
            className="px-8 py-4 text-lg font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl transition-colors"
          >
            Get Started
          </Button>
          <Button
            onClick={() => router.push('/pages/student/courses')}
            className="px-8 py-4 text-lg font-bold bg-neutral-800 hover:bg-neutral-700 text-white rounded-xl transition-colors"
          >
            Explore Courses
          </Button>
        </div>

        {/* Features Grid */}
        <div className="animate-fade-in-up delay-400 grid grid-cols-1 md:grid-cols-3 gap-8 w-full max-w-3xl">
          <div className="bg-neutral-900/50 backdrop-blur-md border border-neutral-800 rounded-2xl p-6">
            <div className="w-12 h-12 bg-indigo-500/10 rounded-lg flex items-center justify-center mx-auto mb-4">
              <BookOpen className="w-6 h-6 text-indigo-400" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Learn</h3>
            <p className="text-sm text-neutral-400">
              Interactive courses on Polkadot, Substrate, and Web3 development
            </p>
          </div>

          <div className="bg-neutral-900/50 backdrop-blur-md border border-neutral-800 rounded-2xl p-6">
            <div className="w-12 h-12 bg-indigo-500/10 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Award className="w-6 h-6 text-indigo-400" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Earn</h3>
            <p className="text-sm text-neutral-400">
              Get rewarded with tokens for completing milestones and courses
            </p>
          </div>

          <div className="bg-neutral-900/50 backdrop-blur-md border border-neutral-800 rounded-2xl p-6">
            <div className="w-12 h-12 bg-indigo-500/10 rounded-lg flex items-center justify-center mx-auto mb-4">
              <Users className="w-6 h-6 text-indigo-400" />
            </div>
            <h3 className="text-lg font-bold text-white mb-2">Teach</h3>
            <p className="text-sm text-neutral-400">
              Create courses, grade submissions, and earn as an educator
            </p>
          </div>
        </div>

        {/* Stats / Features snippet */}
        <div className="animate-fade-in-up delay-400 mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 w-full border-t border-neutral-800/50 pt-10">
          <div className="flex flex-col items-center">
            <div className="text-3xl font-bold text-white mb-1">100%</div>
            <div className="text-neutral-500 text-sm uppercase tracking-wider">
              Decentralized
            </div>
          </div>
          <div className="flex flex-col items-center">
            <div className="text-3xl font-bold text-white mb-1">AI</div>
            <div className="text-neutral-500 text-sm uppercase tracking-wider">
              Powered Grading
            </div>
          </div>
          <div className="flex flex-col items-center">
            <div className="text-3xl font-bold text-white mb-1">PAS</div>
            <div className="text-neutral-500 text-sm uppercase tracking-wider">
              Token Rewards
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
