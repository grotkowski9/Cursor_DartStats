import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getMatchByShareToken } from "@/lib/matches";
import { siteDocumentTitle, SITE_OG_TITLE } from "@/lib/page-metadata";
import { MatchView } from "./match-view";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: siteDocumentTitle(),
  description: "Prywatny podgląd meczu darta — rzut po rzucie. Nieindeksowany.",
  robots: { index: false, follow: false },
  openGraph: {
    title: SITE_OG_TITLE,
    description: "Prywatny mecz — dostęp tylko przez link.",
  },
};

type MatchPageProps = {
  params: Promise<{ shareToken: string }>;
};

export default async function MatchPage({ params }: MatchPageProps) {
  const { shareToken } = await params;
  const match = await getMatchByShareToken(shareToken);
  if (!match) notFound();

  return (
    <main className="relative min-h-screen overflow-hidden bg-background px-4 py-8 text-foreground md:py-12">
      <div className="bg-grid absolute inset-0 z-0 opacity-15" aria-hidden />
      <div
        className="absolute left-1/2 top-[-10%] z-0 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-gradient-to-br from-accent-from/30 to-accent-to/30 blur-[120px]"
        aria-hidden
      />
      <div className="relative z-10 mx-auto flex w-full max-w-md flex-col gap-6 md:max-w-2xl">
        <MatchView match={match} />
      </div>
    </main>
  );
}
