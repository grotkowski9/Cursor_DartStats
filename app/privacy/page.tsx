import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PrivacyPolicyContent } from "@/components/privacy-policy-content";
import { SiteFooter } from "@/components/site-footer";
import { getSiteUrl, SITE_NAME } from "@/lib/site-config";

export const metadata: Metadata = {
  title: { absolute: `Polityka prywatności | ${SITE_NAME}` },
  description:
    "Polityka prywatności Sylveon Company — dotyczy sylveoncompany.pl oraz dart.sylveoncompany.pl (Sylveon Dart Profile).",
  robots: { index: true, follow: true },
  alternates: { canonical: `${getSiteUrl()}/privacy` },
};

export default function PrivacyPage() {
  return (
    <>
      <main className="relative overflow-hidden bg-background text-foreground">
        <div className="bg-grid absolute inset-0 z-0 opacity-15" aria-hidden />
        <div
          className="absolute left-1/2 top-[-15%] z-0 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-gradient-to-br from-accent-from/20 to-accent-to/20 blur-[120px]"
          aria-hidden
        />

        <article className="relative z-10 mx-auto max-w-3xl px-6 pb-16 pt-10 md:pt-14">
          <Link
            href="/"
            className="mb-8 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition hover:text-primary"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Strona główna
          </Link>

          <header>
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
              Polityka prywatności
            </h1>
            <p className="mt-3 text-sm text-muted-foreground">
              Data ostatniej aktualizacji:{" "}
              <time dateTime="2026-08-07">7 sierpnia 2026&nbsp;r.</time>
            </p>
          </header>

          <div className="mt-10 border-t border-white/10 pt-2">
            <PrivacyPolicyContent />
          </div>
        </article>
      </main>
      <SiteFooter />
    </>
  );
}
