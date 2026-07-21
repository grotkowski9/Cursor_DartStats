import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { redirect } from "next/navigation";
import { requireAuthCustomer } from "@/lib/auth";
import { needsOnboarding } from "@/lib/customer";
import { siteDocumentTitle } from "@/lib/page-metadata";
import { AboutForm } from "@/components/about-form";
import { OnboardingShell } from "@/components/onboarding-shell";
import { customerToAboutValues } from "@/lib/about-form-values";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: siteDocumentTitle(),
  description: "O Tobie — opcjonalny profil dartera.",
  robots: { index: false, follow: false },
};

export default async function OnboardingAboutPage() {
  const { customer } = await requireAuthCustomer({
    allowIncompleteOnboarding: true,
    allowIncompleteAbout: true,
  });
  if (needsOnboarding(customer)) {
    redirect("/onboarding");
  }

  const nextHref = customer.tourCompletedAt
    ? "/profile"
    : "/demo/profile?tour=1";

  return (
    <OnboardingShell
      stepLabel="Krok 2"
      title="O Tobie"
      subtitle="Opcjonalnie — ale warto. Pomiń możesz zawsze; wrócisz do tego w profilu."
    >
      <nav className="-mt-2">
        <Link
          href="/onboarding"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-primary"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          Wróć do Kroku 1
        </Link>
      </nav>
      <AboutForm
        initial={customerToAboutValues(customer)}
        mode="onboarding"
        nextHref={nextHref}
        showEncouragement
      />
    </OnboardingShell>
  );
}
