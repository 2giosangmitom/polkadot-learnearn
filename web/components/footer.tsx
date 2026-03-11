"use client";

import { Separator } from "@/components/ui/separator";
import { useTheme } from "next-themes";
import { useState, useEffect } from "react";

export function Footer() {
  const [mounted, setMounted] = useState(false);
  const { theme } = useTheme();

  useEffect(() => setMounted(true), []);

  return (
    <footer className="border-t border-border/50 bg-card/30 py-12 px-4">
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center text-primary-foreground">
              <img
                src={
                  mounted && theme === "dark"
                    ? "/logo-dark.svg"
                    : "/logo-light.svg"
                }
                alt="Learn & Earn"
                className="w-8"
              />
            </div>
            <span className="font-bold text-lg">
              Learn<span className="text-primary">&</span>Earn
            </span>
          </div>
          <p className="max-w-md text-sm text-muted-foreground">
            A modern learning platform for building practical skills. Browse
            expert-led courses, complete lessons and quizzes, and track your
            progress.
          </p>
          <Separator className="my-4 max-w-xs" />
          <p className="text-xs text-muted-foreground">Built on Polkadot.</p>
        </div>
      </div>
    </footer>
  );
}
