import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getCustomerById } from "@/lib/customer";
import { ProfileClient } from "./profile-client";
import { ProfileHeader } from "./profile-header";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Profil — Dart Profile Tracker",
  description: "Twój profil zawodnika: importuj mecze z n01 i przeglądaj statystyki.",
  robots: { index: false, follow: false },
};

export default async function ProfilePage() {
  const customer = await getCustomerById();

  return (
    <main className="relative min-h-screen overflow-hidden bg-background px-4 py-8 text-foreground md:py-12">
      <div className="bg-grid absolute inset-0 z-0 opacity-15" aria-hidden />
      <div
        className="absolute left-1/2 top-[-10%] z-0 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-gradient-to-br from-accent-from/35 to-accent-to/35 blur-[120px]"
        aria-hidden
      />

      <div className="relative z-10 mx-auto flex w-full max-w-md flex-col gap-8 md:max-w-2xl">
        <nav>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-primary"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Strona główna
          </Link>
        </nav>

        {customer ? (
          <ProfileHeader customer={customer} />
        ) : (
          <header className="flex flex-col gap-1">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary/80">
              Witaj,
            </span>
            <h1 className="text-3xl font-bold leading-tight tracking-tight md:text-4xl">
              Profil zawodnika
            </h1>
          </header>
        )}

        <ProfileClient />
      </div>
    </main>
  );
}
