"use client";

import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  stepLabel: string;
  title: string;
  subtitle?: string;
};

/** Shared onboarding chrome — soft mint + rose/lilac blooms (not brand-locked). */
export function OnboardingShell({ children, stepLabel, title, subtitle }: Props) {
  return (
    <main className="onboarding-shell relative min-h-screen overflow-hidden bg-background px-4 py-8 text-foreground md:py-12">
      <div className="bg-grid absolute inset-0 z-0 opacity-15" aria-hidden />
      <div
        className="absolute left-1/2 top-[-12%] z-0 h-[540px] w-[540px] -translate-x-1/2 rounded-full opacity-90 blur-[120px]"
        style={{
          background:
            "radial-gradient(circle at 35% 40%, color-mix(in oklab, var(--onb-mint) 55%, transparent), transparent 62%), radial-gradient(circle at 70% 55%, color-mix(in oklab, var(--onb-rose) 45%, transparent), transparent 58%), radial-gradient(circle at 50% 80%, color-mix(in oklab, var(--onb-lilac) 40%, transparent), transparent 55%)",
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute right-[-18%] top-[18%] z-0 h-[280px] w-[280px] rounded-full border border-white/5 opacity-40"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute right-[-8%] top-[22%] z-0 h-[180px] w-[180px] rounded-full border border-dashed border-white/10 opacity-30"
        aria-hidden
      />

      <div className="relative z-10 mx-auto flex w-full max-w-md flex-col gap-8">
        <header className="flex flex-col gap-1">
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-[color:var(--onb-mint)]/90">
            {stepLabel}
          </span>
          <h1 className="text-3xl font-bold leading-tight tracking-tight">
            <span className="bg-gradient-to-r from-[color:var(--onb-mint)] via-[color:var(--onb-lilac)] to-[color:var(--onb-rose)] bg-clip-text text-transparent">
              {title}
            </span>
          </h1>
          {subtitle ? (
            <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
          ) : null}
        </header>
        {children}
      </div>
    </main>
  );
}
