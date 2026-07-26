"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Target } from "lucide-react";

type Props = {
  code?: string;
  title: string;
  subtitle: string;
  /** Seconds before redirect to `/`. Default 10. Set 0 to disable. */
  redirectSeconds?: number;
};

export function ErrorScreen({
  code = "404",
  title,
  subtitle,
  redirectSeconds = 10,
}: Props) {
  const router = useRouter();
  const [left, setLeft] = useState(redirectSeconds);
  const auto = redirectSeconds > 0;

  useEffect(() => {
    if (!auto) return;
    if (left <= 0) {
      router.replace("/");
      return;
    }
    const t = window.setTimeout(() => setLeft((s) => s - 1), 1000);
    return () => window.clearTimeout(t);
  }, [auto, left, router]);

  return (
    <main className="relative flex min-h-screen flex-col overflow-hidden bg-background text-foreground">
      <div className="bg-grid absolute inset-0 z-0 opacity-20" aria-hidden />
      <div
        className="absolute left-1/2 top-[-15%] z-0 h-[560px] w-[560px] -translate-x-1/2 rounded-full bg-gradient-to-br from-accent-from/40 via-signal/20 to-accent-to/40 blur-[120px]"
        aria-hidden
      />
      <div
        className="absolute bottom-[-10%] right-[-10%] z-0 h-[320px] w-[320px] rounded-full bg-gradient-to-tl from-accent-to/30 to-transparent blur-[100px]"
        aria-hidden
      />

      <div className="relative z-10 mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center px-6 py-16 text-center">
        <div className="relative mb-8 inline-flex dartboard-ring">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-card/60 text-primary backdrop-blur-xl">
            <Target className="h-8 w-8" aria-hidden />
          </div>
        </div>

        <p className="text-[11px] font-bold uppercase tracking-[0.25em] text-signal">
          Error {code}
        </p>

        <h1 className="mt-3 text-3xl font-bold leading-tight tracking-tight md:text-4xl">
          <span className="text-accent-gradient">{title}</span>
        </h1>

        <p className="mt-4 text-base leading-relaxed text-muted-foreground md:text-lg">
          {subtitle}
        </p>

        <div className="mt-8 flex w-full max-w-sm flex-col gap-3">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-accent-from to-accent-to px-6 py-3.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-accent-to/25 transition-transform hover:scale-[1.02]"
          >
            <ArrowLeft className="h-4 w-4" />
            Wróć na stronę główną
          </Link>

          {auto ? (
            <p className="text-xs text-muted-foreground">
              Za{" "}
              <span className="font-semibold tabular-nums text-accent-from">{left}</span>{" "}
              {left === 1 ? "sekundę" : left >= 2 && left <= 4 ? "sekundy" : "sekund"}{" "}
              przeniesiemy Cię automatycznie…
            </p>
          ) : null}
        </div>
      </div>
    </main>
  );
}
