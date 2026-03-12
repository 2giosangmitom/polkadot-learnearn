"use client";

import { BlurFade } from "@/components/ui/blur-fade";
import { MagicCard } from "@/components/ui/magic-card";
import {
  Brain,
  Coins,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { useTheme } from "next-themes";

const features = [
  {
    icon: Brain,
    title: "AI-Powered Quizzes",
    description:
      "Smart quizzes generated from lesson content to help you practice and retain knowledge.",
  },
  {
    icon: Coins,
    title: "Optional Rewards",
    description:
      "Small platform credits for completing quizzes and milestones. Focus stays on learning first.",
  },
  {
    icon: ShieldCheck,
    title: "On-Chain Verification",
    description:
      "Transparent verification for transactions used only for optional payments and rewards.",
  },
  {
    icon: Zap,
    title: "x402",
    description:
      "Advanced hands-on module with practical labs, assessments, and real-world scenarios to deepen your skills.",
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
              A complete platform for practical, video-first learning with
              optional on-chain verification and rewards.
            </p>
          </BlurFade>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
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
