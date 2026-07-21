"use client";

import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  stepLabel: string;
  title: string;
  subtitle?: string;
};

/** Onboarding chrome — te same barwy co reszta aplikacji. */
export function OnboardingShell({ children, stepLabel, title, subtitle }: Props) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-background px-4 py-8 text-foreground md:py-12">
      <div className="bg-grid absolute inset-0 z-0 opacity-15" aria-hidden />
      <div
        className="absolute left-1/2 top-[-10%] z-0 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-gradient-to-br from-accent-from/35 to-accent-to/35 blur-[120px]"
        aria-hidden
      />

      <div className="relative z-10 mx-auto flex w-full max-w-md flex-col gap-8">
        <header className="flex flex-col gap-1">
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary/80">
            {stepLabel}
          </span>
          <h1 className="text-3xl font-bold leading-tight tracking-tight">{title}</h1>
          {subtitle ? (
            <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>
          ) : null}
        </header>
        {children}
      </div>
    </main>
  );
}
