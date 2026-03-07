"use client";

import { BlurFade } from "@/components/ui/blur-fade";
import { MagicCard } from "@/components/ui/magic-card";
import {
  BookOpen,
  Brain,
  Coins,
  ShieldCheck,
  Sparkles,
  Video,
} from "lucide-react";
import { useTheme } from "next-themes";

const features = [
  {
    icon: BookOpen,
    title: "Interactive Courses",
    description:
      "Structured learning paths with video lessons covering blockchain fundamentals to advanced Polkadot development.",
  },
  {
    icon: Brain,
    title: "AI-Powered Quizzes",
    description:
      "Quizzes are auto-generated from lesson content using AI, ensuring relevant and challenging assessments.",
  },
  {
    icon: Coins,
    title: "Earn PAS Tokens",
    description:
      "Complete quizzes successfully and earn PAS token rewards sent directly to your connected wallet.",
  },
  {
    icon: ShieldCheck,
    title: "On-Chain Verification",
    description:
      "Every payment and reward is verified on the Polkadot Paseo testnet. Full transparency, zero trust required.",
  },
  {
    icon: Video,
    title: "Video-First Learning",
    description:
      "Watch curated YouTube lessons. Subtitles are extracted automatically to power smart quiz generation.",
  },
  {
    icon: Sparkles,
    title: "Teacher Tools",
    description:
      "Create courses, add lessons, set prices, and let AI generate quizzes. Everything you need to teach web3.",
  },
];

export function FeaturesSection() {
  const { theme } = useTheme();

  return (
    <section className="py-24 px-4">
      <div className="mx-auto max-w-7xl">
        <div className="mb-16 text-center">
          <BlurFade delay={0.1}>
            <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
              Everything You Need to{" "}
              <span className="text-primary">Learn & Earn</span>
            </h2>
          </BlurFade>
          <BlurFade delay={0.2}>
            <p className="mx-auto max-w-2xl text-muted-foreground">
              A complete platform for blockchain education with real crypto
              incentives. Built on Polkadot.
            </p>
          </BlurFade>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, i) => (
            <BlurFade key={feature.title} delay={0.15 + i * 0.08}>
              <MagicCard
                className="h-full cursor-default p-6"
                gradientColor={
                  theme === "dark"
                    ? "rgba(230, 0, 122, 0.08)"
                    : "rgba(230, 0, 122, 0.06)"
                }
              >
                <div className="flex flex-col gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <feature.icon className="h-6 w-6" />
                  </div>
                  <h3 className="text-lg font-semibold">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </MagicCard>
            </BlurFade>
          ))}
        </div>
      </div>
    </section>
  );
}
