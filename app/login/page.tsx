import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, LogIn, Target, UserPlus } from "lucide-react";
import { SiteFooter } from "@/components/site-footer";
import { getSiteUrl, SITE_NAME } from "@/lib/site-config";
import { siteDocumentTitle } from "@/lib/page-metadata";

export const metadata: Metadata = {
  title: siteDocumentTitle(),
  description: "Logowanie do Dart Profile Tracker — wkrótce Google. Zobacz demo profilu bez konta.",
  robots: { index: true, follow: true },
  alternates: { canonical: `${getSiteUrl()}/login` },
};

export default function LoginPage() {
  return (
    <>
      <main className="relative flex min-h-screen flex-col overflow-hidden bg-background text-foreground">
        <div className="bg-grid absolute inset-0 z-0 opacity-15" aria-hidden />
        <div
          className="absolute left-1/2 top-[-15%] z-0 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-gradient-to-br from-accent-from/30 to-accent-to/30 blur-[120px]"
          aria-hidden
        />

        <div className="relative z-10 mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-16">
          <Link
            href="/"
            className="mb-10 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition hover:text-primary"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Strona główna
          </Link>

          <div className="mb-8 inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-border bg-card/60 text-primary backdrop-blur-xl">
            <Target className="h-7 w-7" aria-hidden />
          </div>

          <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
            Konto gracza
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Logowanie Google i rejestracja pojawią się w{" "}
            <strong className="font-medium text-foreground">wersji 1.1</strong> (Auth).
            Na razie zobacz, jak wygląda tracker na przykładowym profilu.
          </p>

          <div className="mt-10 flex flex-col gap-3">
            <Link
              href="/demo/profile"
              className="inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-accent-from to-accent-to px-6 py-3.5 text-sm font-semibold text-primary-foreground shadow-lg shadow-accent-to/20 transition hover:shadow-accent-to/40"
            >
              Zobacz profil demo
            </Link>

            <button
              type="button"
              disabled
              className="inline-flex cursor-not-allowed items-center justify-center gap-2 rounded-full border border-white/15 bg-white/5 px-6 py-3.5 text-sm font-semibold text-muted-foreground opacity-70"
              title="Wkrótce — Faza 4.1"
            >
              <LogIn className="h-4 w-4" />
              Zaloguj się przez Google
            </button>

            <button
              type="button"
              disabled
              className="inline-flex cursor-not-allowed items-center justify-center gap-2 rounded-full border border-white/15 bg-white/5 px-6 py-3.5 text-sm font-semibold text-muted-foreground opacity-70"
              title="Wkrótce — Faza 4.1"
            >
              <UserPlus className="h-4 w-4" />
              Zarejestruj się
            </button>
          </div>

          <p className="mt-8 text-xs text-muted-foreground">
            Masz już dostęp developerski?{" "}
            <Link href="/profile" className="text-primary hover:underline">
              Przejdź do /profile
            </Link>
          </p>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
