import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, LogOut } from "lucide-react";
import { requireAuthCustomer } from "@/lib/auth";
import { siteDocumentTitle, SITE_OG_TITLE } from "@/lib/page-metadata";
import { ProfileClient } from "./profile-client";
import { ProfileHeader } from "./profile-header";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: siteDocumentTitle(),
  description: "Prywatny profil zawodnika — import meczów z N01 i statystyki. Nieindeksowany.",
  robots: { index: false, follow: false },
  openGraph: {
    title: SITE_OG_TITLE,
    description: "Prywatny profil — dostęp tylko dla właściciela.",
  },
};

export default async function ProfilePage() {
  const { customer } = await requireAuthCustomer();

  return (
    <main className="relative min-h-screen overflow-hidden bg-background px-4 py-8 text-foreground md:py-12">
      <div className="bg-grid absolute inset-0 z-0 opacity-15" aria-hidden />
      <div
        className="absolute left-1/2 top-[-10%] z-0 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-gradient-to-br from-accent-from/35 to-accent-to/35 blur-[120px]"
        aria-hidden
      />

      <div className="relative z-10 mx-auto flex w-full max-w-md flex-col gap-8 md:max-w-2xl">
        <nav className="flex items-center justify-between gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-primary"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
            Strona główna
          </Link>
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-primary"
            >
              <LogOut className="h-3.5 w-3.5" />
              Wyloguj
            </button>
          </form>
        </nav>

        <ProfileHeader customer={customer} />

        <ProfileClient
          myDisplayName={`${customer.lastName} ${customer.firstName}`.trim()}
        />
      </div>
    </main>
  );
}
