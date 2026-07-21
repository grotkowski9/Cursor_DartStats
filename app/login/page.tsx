import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Target } from "lucide-react";
import { SiteFooter } from "@/components/site-footer";
import { getSiteUrl } from "@/lib/site-config";
import { siteDocumentTitle } from "@/lib/page-metadata";
import { LoginGoogleButton } from "./login-google-button";
import { LoginPasswordForm } from "./login-password-form";

export const metadata: Metadata = {
  title: siteDocumentTitle(),
  description: "Zaloguj się do Dart Profile Tracker przez Google i śledź swoje statystyki darta.",
  robots: { index: true, follow: true },
  alternates: { canonical: `${getSiteUrl()}/login` },
};

type Props = {
  searchParams: Promise<{ next?: string; error?: string }>;
};

export default async function LoginPage({ searchParams }: Props) {
  const params = await searchParams;
  const next = params.next?.startsWith("/") ? params.next : "/profile";
  const authError = params.error === "auth";

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
            Zaloguj się e-mailem albo przez Google, zaimportuj mecze z N01 i śledź formę na
            prywatnym profilu. Chcesz najpierw zobaczyć jak to wygląda?{" "}
            <Link href="/demo/profile" className="text-primary hover:underline">
              Otwórz profil demo
            </Link>
            .
          </p>

          {authError && (
            <p className="mt-4 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
              Logowanie nieudane. Zamknij kartę, otwórz logowanie od nowa i spróbuj jeszcze raz
              (nie odświeżaj strony po powrocie z Google). Sprawdź też Redirect URLs w Supabase.
            </p>
          )}

          <div className="mt-10 flex flex-col gap-6">
            <LoginPasswordForm next={next} />

            <div className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              <span className="h-px flex-1 bg-white/10" />
              albo
              <span className="h-px flex-1 bg-white/10" />
            </div>

            <LoginGoogleButton next={next} />

            <Link
              href="/demo/profile"
              className="inline-flex items-center justify-center gap-2 rounded-full border border-white/15 bg-white/5 px-6 py-3.5 text-sm font-semibold text-foreground transition hover:bg-white/10"
            >
              Zobacz profil demo
            </Link>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
