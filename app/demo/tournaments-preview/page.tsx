import Link from "next/link";
import { TournamentsPreviewClient } from "./preview-client";

export default function TournamentsPreviewPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 bg-grid opacity-15" />
      <div className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-gradient-to-br from-accent-from/35 to-accent-to/35 blur-[120px]" />

      <div className="relative mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-8 md:max-w-2xl md:px-6">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <Link href="/demo/profile" className="hover:text-foreground">
            ← Demo profil
          </Link>
          <span className="rounded-lg border border-amber-400/30 bg-amber-400/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-amber-200">
            Podgląd 0.3.14–17
          </span>
        </div>

        <header className="space-y-2">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
            Mock UI · bez logiki produkcyjnej
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">
            Analityka turniejowa
          </h1>
          <p className="text-sm text-muted-foreground">
            Tak mogłoby wyglądać na profilu: sezon, lista turniejów, porównanie
            sesji i wykres formy per tytuł z N01.
          </p>
        </header>

        <TournamentsPreviewClient />
      </div>
    </main>
  );
}
