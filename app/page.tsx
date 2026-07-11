import Link from "next/link";
import { ArrowRight, Target } from "lucide-react";

export default function HomePage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-6 py-12 text-foreground">
      <div className="bg-grid absolute inset-0 z-0 opacity-20" aria-hidden />
      <div
        className="absolute left-1/2 top-[-15%] z-0 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-gradient-to-br from-accent-from/30 to-accent-to/30 blur-[120px]"
        aria-hidden
      />

      <div className="relative z-10 mx-auto w-full max-w-md text-center">
        <div className="mb-8 inline-flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-card/60 text-primary backdrop-blur-xl">
          <Target className="h-8 w-8" aria-hidden />
        </div>

        <h1 className="text-4xl font-bold leading-tight tracking-tight md:text-5xl">
          Dart <span className="text-accent-gradient">Profile</span> Tracker
        </h1>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground">
          Twój prywatny panel statystyk darta. Zaimportuj mecz z n01 i zobacz,
          jak grasz naprawdę.
        </p>

        <div className="mt-10">
          <Link
            href="/profile"
            className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-accent-from to-accent-to px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-accent-to/20 transition-all hover:shadow-accent-to/40 md:w-auto"
          >
            Przejdź do swojego profilu
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </div>
    </main>
  );
}
