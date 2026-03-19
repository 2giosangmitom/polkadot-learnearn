import { useState } from "react";

export function CTASection() {
  return (
    <section className="py-24 px-4 bg-gradient-to-r from-primary/10 via-primary/5 to-primary/10">
      <div className="mx-auto max-w-4xl text-center">
        <h2 className="text-3xl font-bold tracking-tight sm:text-4xl mb-6">
          Start Investing in the Future of Education
        </h2>

        <p className="text-xs text-muted-foreground mt-6">
          All investments are secured by smart contracts.
        </p>
      </div>
    </section>
  );
}