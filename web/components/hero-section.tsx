"use client";

import Link from "next/link";
import { Particles } from "@/components/ui/particles";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { TextAnimate } from "@/components/ui/text-animate";
import { WordRotate } from "@/components/ui/word-rotate";
import { BorderBeam } from "@/components/ui/border-beam";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export function HeroSection() {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <section className="relative flex min-h-[calc(100vh-4rem)] flex-col items-center justify-center overflow-hidden px-4 py-24">
      {/* Particles background */}
      {mounted && (
        <Particles
          className="absolute inset-0 -z-10"
          quantity={80}
          color={theme === "dark" ? "#e6007a" : "#e6007a"}
          staticity={40}
          ease={50}
          size={0.5}
        />
      )}

      {/* Glowing orb behind text */}
      <div className="pointer-events-none absolute top-1/2 left-1/2 -z-10 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-[120px]" />

      <div className="mx-auto max-w-4xl text-center">
        <div className="mb-6 inline-flex items-center rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm text-primary">
          <span className="mr-2 h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
          Powered by Polkadot Paseo Testnet
        </div>

        <h1 className="mb-4 text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
          <TextAnimate animation="blurInUp" by="word" delay={0.1}>
            Learn Blockchain.
          </TextAnimate>
        </h1>

        <div className="mb-6 flex flex-wrap items-center justify-center gap-3 text-3xl font-extrabold tracking-tight sm:text-4xl md:text-6xl lg:text-7xl">
          <span className="text-primary">Earn</span>
          <WordRotate
            className="text-primary"
            words={["Crypto.", "Knowledge.", "Rewards.", "Skills."]}
          />
        </div>

        <p className="mx-auto mb-10 max-w-2xl text-lg text-muted-foreground sm:text-xl">
          Master blockchain development through interactive courses with
          AI-generated quizzes. Complete lessons and earn PAS token rewards
          directly to your wallet.
        </p>

        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Link href="/courses">
            <ShimmerButton
              className="h-12 px-8 text-base font-semibold"
              shimmerColor="#e6007a"
              shimmerSize="0.1em"
            >
              Explore Courses
            </ShimmerButton>
          </Link>
          <Link href="/onboarding">
            <ShimmerButton
              className="h-12 px-8 text-base font-semibold text-black dark:text-white"
              shimmerColor="#ffffff"
              background="transparent"
              shimmerSize="0.08em"
            >
              Get Started
            </ShimmerButton>
          </Link>
        </div>
      </div>

      {/* Stats bar */}
      <div className="relative mt-20 w-full max-w-3xl rounded-2xl border border-border/50 bg-card/50 p-6 backdrop-blur-sm">
        <BorderBeam size={200} duration={8} colorFrom="#e6007a" colorTo="#552bbf" />
        <div className="grid grid-cols-3 gap-3 text-center sm:gap-6">
          <div>
            <div className="text-2xl font-bold text-primary sm:text-3xl">
              100%
            </div>
            <div className="text-sm text-muted-foreground">On-Chain Verified</div>
          </div>
          <div>
            <div className="text-2xl font-bold sm:text-3xl">AI</div>
            <div className="text-sm text-muted-foreground">Generated Quizzes</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-primary sm:text-3xl">
              PAS
            </div>
            <div className="text-sm text-muted-foreground">Token Rewards</div>
          </div>
        </div>
      </div>
    </section>
  );
}
