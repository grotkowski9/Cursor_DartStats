import type { DetectedUrl } from "@/lib/sources/types";

const N01_HOST = /n01darts\.com$/i;
const PRD_HOST = /polskirankingdarta\.pl$/i;
const PRD_SLUG = /^\/turnieje\/([^/?#]+)/i;

function parseHttpUrl(raw: string): URL | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    if (!/^https?:$/i.test(parsed.protocol)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function detectSourceUrl(raw: string): DetectedUrl {
  const trimmed = raw.trim();
  if (!trimmed) return { kind: "unknown", url: trimmed, reason: "empty" };

  const parsed = parseHttpUrl(trimmed);
  if (!parsed) return { kind: "unknown", url: trimmed, reason: "not_url" };

  const host = parsed.hostname.replace(/^www\./i, "");

  if (N01_HOST.test(host)) {
    const tmid = parsed.searchParams.get("tmid")?.trim();
    if (tmid) return { kind: "n01_match", url: trimmed, tmid };

    const path = parsed.pathname.toLowerCase();
    if (path.includes("/tournament/comp.php") || path.includes("/tournament/comp")) {
      const tdid = parsed.searchParams.get("id")?.trim();
      if (tdid) return { kind: "n01_tournament", url: trimmed, tdid };
      return { kind: "unknown", url: trimmed, reason: "n01_tournament_missing_id" };
    }

    if (path.includes("/league/portal.php") || path.includes("/league/portal")) {
      const lgid = parsed.searchParams.get("lgid")?.trim();
      if (lgid) return { kind: "n01_league", url: trimmed, lgid };
      return { kind: "unknown", url: trimmed, reason: "n01_league_missing_lgid" };
    }

    if (path.includes("/league/season.php") || path.includes("/league/season")) {
      const lgid =
        parsed.searchParams.get("lgid")?.trim() || parsed.searchParams.get("id")?.trim();
      if (lgid) return { kind: "n01_league", url: trimmed, lgid };
      return { kind: "unknown", url: trimmed, reason: "n01_league_missing_id" };
    }

    return { kind: "unknown", url: trimmed, reason: "n01_unsupported" };
  }

  if (PRD_HOST.test(host)) {
    const match = parsed.pathname.match(PRD_SLUG);
    if (match?.[1]) {
      return { kind: "prd_tournament", url: trimmed, slug: decodeURIComponent(match[1]) };
    }
    return { kind: "unknown", url: trimmed, reason: "prd_not_tournament" };
  }

  return { kind: "unknown", url: trimmed, reason: "unsupported_host" };
}

export function splitInputUrls(raw: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    const key = trimmed.replace(/\/+$/, "");
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
  }
  return out;
}

export const IMPORT_HINT_N01 =
  "Wklej link meczu (tmid), turnieju (comp.php?id=…) albo ligi N01.";

export const IMPORT_HINT_PRD =
  "Wklej link turnieju z polskirankingdarta.pl (strona turnieju, nie ranking).";

export const IMPORT_HINT_MIXED =
  "Wklej linki — mecz N01, turniej/liga N01 albo turniej PRD. Jeden URL w linii.";
