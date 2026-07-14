import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { DemoBanner } from "@/components/demo-banner";
import { SiteFooter } from "@/components/site-footer";
import { getDemoSnapshot, personaToCustomer } from "@/lib/demo";
import { DEMO_PERSONA } from "@/demo/demo-persona";
import { siteDocumentTitle, SITE_OG_TITLE } from "@/lib/page-metadata";
import { getSiteUrl, SITE_NAME } from "@/lib/site-config";
import { ProfileClient } from "@/app/profile/profile-client";
import { ProfileHeader } from "@/app/profile/profile-header";

const persona = DEMO_PERSONA;
const customer = personaToCustomer(persona);
const demoSnapshot = getDemoSnapshot();

export const metadata: Metadata = {
  title: siteDocumentTitle(),
  description: `Przykładowy profil gracza darta: statystyki, wykres formy, H2H. Zobacz, co oferuje ${SITE_NAME} przed rejestracją.`,
  robots: { index: true, follow: true },
  alternates: { canonical: `${getSiteUrl()}/demo/profile` },
  openGraph: {
    title: SITE_OG_TITLE,
    description: persona.tagline,
    url: `${getSiteUrl()}/demo/profile`,
    type: "website",
  },
};

export default function DemoProfilePage() {
  return (
    <>
      <main className="relative min-h-screen overflow-hidden bg-background px-4 py-8 text-foreground md:py-12">
        <div className="bg-grid absolute inset-0 z-0 opacity-15" aria-hidden />
        <div
          className="absolute left-1/2 top-[-10%] z-0 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-gradient-to-br from-accent-from/35 to-accent-to/35 blur-[120px]"
          aria-hidden
        />

        <div className="relative z-10 mx-auto flex w-full max-w-md flex-col gap-8 md:max-w-2xl">
          <nav className="flex flex-wrap items-center justify-between gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-primary"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Strona główna
            </Link>
            <Link
              href="/login"
              className="text-xs font-medium text-primary/90 transition hover:text-primary"
            >
              Załóż konto →
            </Link>
          </nav>

          <DemoBanner />
          <ProfileHeader customer={customer} />
          <p className="-mt-4 text-sm text-muted-foreground">{persona.tagline}</p>

          <ProfileClient
            demoMode
            demoSnapshot={demoSnapshot}
            matchPathPrefix="/demo/m/"
            myDisplayName={`${customer.lastName} ${customer.firstName}`.trim()}
          />
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
