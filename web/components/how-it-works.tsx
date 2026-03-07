"use client";

import { BlurFade } from "@/components/ui/blur-fade";
import { NeonGradientCard } from "@/components/ui/neon-gradient-card";
import { Wallet, BookOpenCheck, Trophy } from "lucide-react";

const steps = [
  {
    icon: Wallet,
    step: "01",
    title: "Connect Your Wallet",
    description:
      "Connect a Polkadot-compatible wallet (SubWallet, Talisman, or Polkadot.js) and choose your role as a Student or Teacher.",
  },
  {
    icon: BookOpenCheck,
    step: "02",
    title: "Learn & Take Quizzes",
    description:
      "Browse courses, watch video lessons, and take AI-generated quizzes to test your understanding of the material.",
  },
  {
    icon: Trophy,
    step: "03",
    title: "Earn Rewards",
    description:
      "Answer quizzes correctly and earn PAS tokens. All rewards are verified on-chain and sent directly to your wallet.",
  },
];

export function HowItWorks() {
  return (
    <section className="py-24 px-4 bg-muted/30">
      <div className="mx-auto max-w-5xl">
        <div className="mb-16 text-center">
          <BlurFade delay={0.1}>
            <h2 className="mb-4 text-3xl font-bold tracking-tight sm:text-4xl">
              How It <span className="text-primary">Works</span>
            </h2>
          </BlurFade>
          <BlurFade delay={0.2}>
            <p className="mx-auto max-w-xl text-muted-foreground">
              Three simple steps to start learning and earning on Polkadot.
            </p>
          </BlurFade>
        </div>

        <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-3">
          {steps.map((item, i) => (
            <BlurFade key={item.step} delay={0.2 + i * 0.1}>
              <NeonGradientCard
                className="h-full"
                neonColors={{
                  firstColor: "var(--color-pink-500)",
                  secondColor: "var(--color-blue-400)",
                }}
                borderSize={2}
                borderRadius={16}
              >
                <div className="flex flex-col items-center p-6 text-center">
                  <span className="mb-3 text-5xl font-black text-primary">
                    {item.step}
                  </span>
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <item.icon className="h-7 w-7" />
                  </div>
                  <h3 className="mb-2 text-lg font-bold">{item.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </NeonGradientCard>
            </BlurFade>
          ))}
        </div>
      </div>
    </section>
  );
}
