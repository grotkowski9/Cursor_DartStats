import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { requireAuthCustomer } from "@/lib/auth";
import { suggestKnownNicknames } from "@/lib/identity-suggest";
import { siteDocumentTitle } from "@/lib/page-metadata";
import { IdentityForm } from "@/components/identity-form";
import { OnboardingShell } from "@/components/onboarding-shell";

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
    <OnboardingShell
      stepLabel="Krok 1"
      title="Ustaw swój profil"
      subtitle="Uzupełnij imię, nazwisko i wzorce z N01. Bez tego nie zaimportujemy Twoich meczów."
    >
      <nav className="-mt-2">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-primary"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Strona główna
        </Link>
      </nav>
      <IdentityForm initial={initial} mode="onboarding" />
    </OnboardingShell>
  );
}
