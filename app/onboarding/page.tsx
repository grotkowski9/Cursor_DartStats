import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { requireAuthCustomer } from "@/lib/auth";
import { siteDocumentTitle } from "@/lib/page-metadata";
import { IdentityForm, suggestKnownNicknames } from "@/components/identity-form";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: siteDocumentTitle(),
  description: "Uzupełnij profil gracza — nicki do auto-wykrywania w meczach N01.",
  robots: { index: false, follow: false },
};

export default async function OnboardingPage() {
  const { customer } = await requireAuthCustomer({ allowIncompleteOnboarding: true });

  const initial = {
    firstName: customer.firstName === "Gracz" ? "" : customer.firstName,
    lastName: customer.lastName === "Dart" ? "" : customer.lastName,
    nickname: customer.nickname ?? "",
    knownNicknames: suggestKnownNicknames({
      firstName: customer.firstName,
      lastName: customer.lastName,
      nickname: customer.nickname,
      knownNicknames: customer.knownNicknames,
    }),
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-background px-4 py-8 text-foreground md:py-12">
      <div className="bg-grid absolute inset-0 z-0 opacity-15" aria-hidden />
      <div
        className="absolute left-1/2 top-[-10%] z-0 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-gradient-to-br from-accent-from/35 to-accent-to/35 blur-[120px]"
        aria-hidden
      />

      <div className="relative z-10 mx-auto flex w-full max-w-md flex-col gap-8">
        <nav>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-primary"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Strona główna
          </Link>
        </nav>

        <header className="flex flex-col gap-1">
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary/80">
            Krok 1
          </span>
          <h1 className="text-3xl font-bold leading-tight tracking-tight">
            Ustaw swój profil
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Po Google uzupełnij imię, nazwisko i wzorce z N01. Bez tego nie zaimportujemy
            Twoich meczów.
          </p>
        </header>

        <IdentityForm initial={initial} mode="onboarding" />
      </div>
    </main>
  );
}
