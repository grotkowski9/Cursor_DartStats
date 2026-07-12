import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { DemoBanner } from "@/components/demo-banner";
import { SiteFooter } from "@/components/site-footer";
import { getDemoMatchByShareToken } from "@/lib/demo";
import { getSiteUrl, SITE_NAME } from "@/lib/site-config";
import { MatchView } from "@/app/m/[shareToken]/match-view";

type Props = { params: Promise<{ shareToken: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { shareToken } = await params;
  const match = getDemoMatchByShareToken(shareToken);
  if (!match) return { title: "Mecz demo — nie znaleziono" };

  return {
    title: `${match.title} — mecz demo | ${SITE_NAME}`,
    description: `Podgląd przykładowego meczu darta — rzut po rzucie, statystyki legów. Demo ${SITE_NAME}.`,
    robots: { index: true, follow: true },
    alternates: { canonical: `${getSiteUrl()}/demo/m/${shareToken}` },
    openGraph: {
      title: match.title,
      description: `Mecz demo — ${SITE_NAME}`,
      url: `${getSiteUrl()}/demo/m/${shareToken}`,
      type: "article",
    },
  };
}

export default async function DemoMatchPage({ params }: Props) {
  const { shareToken } = await params;
  const match = getDemoMatchByShareToken(shareToken);
  if (!match) notFound();

  return (
    <>
      <main className="relative min-h-screen overflow-hidden bg-background px-4 py-8 text-foreground md:py-12">
        <div className="bg-grid absolute inset-0 z-0 opacity-15" aria-hidden />
        <div
          className="absolute left-1/2 top-[-10%] z-0 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-gradient-to-br from-accent-from/35 to-accent-to/35 blur-[120px]"
          aria-hidden
        />

        <div className="relative z-10 mx-auto flex w-full max-w-md flex-col gap-8 md:max-w-2xl">
          <DemoBanner />
          <MatchView
            match={match}
            backHref="/demo/profile"
            matchPathPrefix="/demo/m/"
          />
          <p className="text-center text-xs text-muted-foreground">
            <Link href="/demo/profile" className="text-primary hover:underline">
              ← Wróć do profilu demo
            </Link>
            {" · "}
            <Link href="/login" className="text-primary hover:underline">
              Załóż własne konto
            </Link>
          </p>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
