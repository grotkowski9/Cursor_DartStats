import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getMatchByShareToken } from "@/lib/matches";
import { toClientMatch } from "@/lib/match-client";
import { siteDocumentTitle, SITE_OG_TITLE } from "@/lib/page-metadata";
import { rateLimit } from "@/lib/rate-limit";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
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

async function logShareAccess(opts: {
  shareToken: string;
  accessKind: "hit" | "miss";
  matchId: string | null;
}) {
  try {
    const h = await headers();
    const ua = h.get("user-agent")?.slice(0, 500) ?? null;
    const ip =
      h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      h.get("x-real-ip") ||
      null;
    await getSupabaseAdmin().from("snapshot_access_log").insert({
      share_token: opts.shareToken,
      access_kind: opts.accessKind,
      match_id: opts.matchId,
      user_agent: ua,
      ip_address: ip,
    });
  } catch {
    /* audit log must not break the page */
  }
}

export default async function MatchPage({ params }: MatchPageProps) {
  const { shareToken } = await params;

  const h = await headers();
  const ip =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    "unknown";
  const rl = rateLimit(`share:${ip}`, { limit: 60, windowMs: 60_000 });
  if (!rl.ok) notFound();

  const match = await getMatchByShareToken(shareToken);
  if (!match) {
    void logShareAccess({ shareToken, accessKind: "miss", matchId: null });
    notFound();
  }

  void logShareAccess({
    shareToken,
    accessKind: "hit",
    matchId: match.matchId ?? null,
  });

  return (
    <main className="relative min-h-screen overflow-hidden bg-background px-4 py-8 text-foreground md:py-12">
      <div className="bg-grid absolute inset-0 z-0 opacity-15" aria-hidden />
      <div
        className="absolute left-1/2 top-[-10%] z-0 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-gradient-to-br from-accent-from/30 to-accent-to/30 blur-[120px]"
        aria-hidden
      />
      <div className="relative z-10 mx-auto flex w-full max-w-md flex-col gap-6 md:max-w-2xl">
        <MatchView match={toClientMatch(match)} />
      </div>
    </main>
  );
}
