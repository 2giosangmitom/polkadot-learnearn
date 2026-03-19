"use client";

import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShimmerButton } from "@/components/ui/shimmer-button";
import { TextAnimate } from "@/components/ui/text-animate";
import { Particles } from "@/components/ui/particles";
import { Wallet, Zap, ArrowRight } from "lucide-react";

interface HeroSectionProps {
  onViewInvestmentDeck: () => void;
}

export function HeroSection({ onViewInvestmentDeck }: HeroSectionProps) {
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  return (
    <section className="relative flex min-h-[90vh] flex-col items-center justify-center overflow-hidden px-4 py-24">
      {mounted && (
        <Particles
          className="absolute inset-0 -z-10"
          quantity={60}
          color={theme === "dark" ? "#e6007a" : "#e6007a"}
          staticity={30}
          ease={40}
          size={0.4}
        />
      )}

      <div className="pointer-events-none absolute top-1/2 left-1/2 -z-10 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/10 blur-[120px]" />

      <div className="mx-auto max-w-4xl text-center">
        <Badge className="mb-6 bg-primary/10 text-primary border-primary/20">
          <Zap className="h-3 w-3 mr-1" />
          Investment for the Future of Web3
        </Badge>

        <h1 className="mb-6 text-4xl font-extrabold tracking-tight sm:text-5xl md:text-6xl lg:text-7xl">
          <TextAnimate animation="blurInUp" by="word" delay={0.1}>
            Invest in the Future of
          </TextAnimate>
          <span className="block text-primary mt-2">Education</span>
        </h1>

        <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
          <Button variant="outline" size="lg" className="h-12 px-8" onClick={onViewInvestmentDeck}>
            View Investment Deck
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      </div>
    </section>
  );
}