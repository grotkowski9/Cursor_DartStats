import { SUPPORTED_START_SCORE } from "@/lib/constants";
import type { CustomerProfile } from "@/lib/customer";
import { detectPlayerIndex } from "@/lib/player-detect";
import { customerPatterns, n01NameMatches, resolveCandidates } from "@/lib/sources/identity";
import type {
  GroupIdentity,
  ParticipantCandidate,
  PreviewGroup,
  PreviewMatch,
} from "@/lib/sources/types";

const N01_REST = "https://push.n01darts.com/api/v1";

type N01ListResponse<T> = {
  result: number;
  error?: string;
  list?: T[];
  tournament?: { tdid?: string; title?: string };
  league?: { lgid?: string; title?: string };
};

type N01StatsPlayer = {
  name?: string;
  tpid?: string;
  winLegs?: number;
};

type N01MatchListItem = {
  mid?: string;
  tdid?: string;
  tmid?: string;
  title?: string;
  startTime?: number;
  endMatch?: number;
  match_type?: string;
  statsData?: N01StatsPlayer[];
};

export function n01ViewUrl(tmid: string, ttype: "league" | "tournament" = "tournament"): string {
  return `https://n01darts.com/n01/${ttype}/n01_view.html?tmid=${encodeURIComponent(tmid)}`;
}

async function n01Get<T>(path: string, params: Record<string, string>): Promise<T> {
  const url = new URL(`${N01_REST}/${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) throw new Error(`N01 ${path} zwróciło ${res.status}`);
  return (await res.json()) as T;
}

export async function fetchN01TournamentTitle(tdid: string): Promise<string> {
  const data = await n01Get<N01ListResponse<unknown>>("tournament/get", {
    tdid,
    entry: "0",
  });
  if (data.result !== 0) throw new Error(data.error ?? "Nie znaleziono turnieju N01.");
  return String(data.tournament?.title ?? tdid);
}

export async function fetchN01LeagueTitle(lgid: string): Promise<string> {
  const data = await n01Get<N01ListResponse<unknown>>("league/get", { lgid });
  if (data.result !== 0) throw new Error(data.error ?? "Nie znaleziono ligi N01.");
  return String(data.league?.title ?? lgid);
}

export async function fetchN01LeagueTdids(lgid: string): Promise<string[]> {
  const data = await n01Get<N01ListResponse<{ tdid?: string }>>("league/tournament/list", {
    lgid,
    count: "100",
  });
  if (data.result !== 0) throw new Error(data.error ?? "Nie udało się pobrać eventów ligi N01.");
  return (data.list ?? []).map((t) => t.tdid).filter((id): id is string => Boolean(id));
}

export async function fetchN01FinishedMatches(tdid: string): Promise<N01MatchListItem[]> {
  const out: N01MatchListItem[] = [];
  let skip = 0;
  for (;;) {
    const data = await n01Get<N01ListResponse<N01MatchListItem>>("match/list", {
      tdid,
      endMatch: "1",
      match_type: "01",
      sort: "startTime",
      order: "asc",
      count: "100",
      skip: String(skip),
    });
    if (data.result !== 0) throw new Error(data.error ?? "Nie udało się pobrać listy meczów N01.");
    const page = data.list ?? [];
    out.push(...page);
    if (page.length < 100) break;
    skip += 100;
    if (skip > 5000) break;
  }
  return out.filter((m) => m.tmid && m.endMatch === 1);
}

export async function fetchN01MatchSummary(tmid: string): Promise<N01MatchListItem | null> {
  const data = await n01Get<N01ListResponse<N01MatchListItem>>("match/list", {
    tmid,
    count: "1",
  });
  if (data.result !== 0) return null;
  return data.list?.[0] ?? null;
}

export async function fetchN01MatchByMid(mid: string): Promise<N01MatchListItem | null> {
  const data = await n01Get<N01ListResponse<N01MatchListItem>>("match/list", {
    mid,
    count: "1",
  });
  if (data.result !== 0) return null;
  const row = data.list?.[0];
  if (!row || String(row.mid ?? "") !== mid) return null;
  return row;
}

export function uniqueN01Players(matches: N01MatchListItem[]): ParticipantCandidate[] {
  const map = new Map<string, ParticipantCandidate>();
  for (const m of matches) {
    for (const p of m.statsData ?? []) {
      const name = String(p.name ?? "").trim();
      const id = String(p.tpid ?? name);
      if (!name && !id) continue;
      const prev = map.get(id);
      if (prev) {
        prev.matchCount = (prev.matchCount ?? 0) + 1;
      } else {
        map.set(id, { id, displayName: name || id, matchCount: 1 });
      }
    }
  }
  return [...map.values()];
}

export function pickN01Identity(
  matches: N01MatchListItem[],
  customer: CustomerProfile,
): GroupIdentity {
  const patterns = customerPatterns(customer);
  const all = uniqueN01Players(matches);
  const matched = all.filter((p) => n01NameMatches(p.displayName, customer, patterns));
  return resolveCandidates(
    matched,
    "Nie znalazłem Cię w tym turnieju N01. Wybierz siebie z listy albo pomiń grupę.",
  );
}

export function matchesForParticipant(
  matches: N01MatchListItem[],
  participantId: string,
): N01MatchListItem[] {
  return matches.filter((m) =>
    (m.statsData ?? []).some((p) => String(p.tpid ?? p.name ?? "") === participantId),
  );
}

export function previewMatchesFromN01(opts: {
  matches: N01MatchListItem[];
  participantId: string;
  existing: Map<string, string>;
  ttype?: "league" | "tournament";
}): PreviewMatch[] {
  return opts.matches.map((m) => {
    const stats = m.statsData ?? [];
    const meIdx = stats.findIndex((p) => String(p.tpid ?? p.name ?? "") === opts.participantId);
    const playerIndex: 0 | 1 | null = meIdx === 0 || meIdx === 1 ? (meIdx as 0 | 1) : null;
    const opp = playerIndex === 0 ? stats[1] : playerIndex === 1 ? stats[0] : null;
    const tmid = String(m.tmid);
    const share = opts.existing.get(tmid) ?? null;
    return {
      source: "n01" as const,
      externalId: tmid,
      opponent: opp?.name ?? null,
      myScore: playerIndex !== null ? Number(stats[playerIndex]?.winLegs ?? 0) : null,
      oppScore:
        playerIndex !== null ? Number(stats[playerIndex === 0 ? 1 : 0]?.winLegs ?? 0) : null,
      startTime: m.startTime ?? null,
      startScore: SUPPORTED_START_SCORE,
      alreadyInDb: Boolean(share),
      shareToken: share,
      selected: !share,
      fetchRef: { source: "n01", tmid, viewUrl: n01ViewUrl(tmid, opts.ttype ?? "tournament") },
      playerIndex,
    };
  });
}

export function buildN01CompetitionGroup(opts: {
  groupKey: string;
  kind: "n01_tournament" | "n01_league";
  title: string;
  sourceUrl: string;
  identity: GroupIdentity;
  matches: PreviewMatch[];
  error?: string;
}): PreviewGroup {
  return {
    groupKey: opts.groupKey,
    source: "n01",
    kind: opts.kind,
    title: opts.title,
    sourceUrl: opts.sourceUrl,
    identity: opts.identity,
    matches: opts.matches,
    error: opts.error,
  };
}

export function previewSingleN01Match(opts: {
  tmid: string;
  url: string;
  summary: N01MatchListItem | null;
  customer: CustomerProfile;
  existing: Map<string, string>;
}): PreviewGroup {
  const patterns = customerPatterns(opts.customer);
  const names: [string, string] = [
    opts.summary?.statsData?.[0]?.name ?? "Gracz 1",
    opts.summary?.statsData?.[1]?.name ?? "Gracz 2",
  ];
  const detection = detectPlayerIndex(names, patterns);
  const share = opts.existing.get(opts.tmid) ?? null;
  let playerIndex: 0 | 1 | null = null;
  let identity: GroupIdentity;
  if (detection.status === "auto") {
    playerIndex = detection.playerIndex;
    identity = {
      status: "auto",
      participantId: `slot-${detection.playerIndex}`,
      displayName: names[detection.playerIndex],
    };
  } else if (detection.status === "ambiguous") {
    identity = {
      status: "ambiguous",
      candidates: [
        { id: "slot-0", displayName: names[0] },
        { id: "slot-1", displayName: names[1] },
      ],
    };
  } else {
    identity = {
      status: "none",
      message: "Zawodnicy w tym meczu wyglądają na innych niż Ty. Wybierz siebie albo pomiń.",
      candidates: [
        { id: "slot-0", displayName: names[0] },
        { id: "slot-1", displayName: names[1] },
      ],
    };
  }

  const match: PreviewMatch = {
    source: "n01",
    externalId: opts.tmid,
    opponent:
      playerIndex === 0 ? names[1] : playerIndex === 1 ? names[0] : `${names[0]} vs ${names[1]}`,
    myScore: null,
    oppScore: null,
    startTime: opts.summary?.startTime ?? null,
    startScore: SUPPORTED_START_SCORE,
    alreadyInDb: Boolean(share),
    shareToken: share,
    selected: !share && detection.status === "auto",
    fetchRef: { source: "n01", tmid: opts.tmid, viewUrl: opts.url.includes("tmid=") ? opts.url : n01ViewUrl(opts.tmid) },
    playerIndex,
  };

  return {
    groupKey: `n01-match:${opts.tmid}`,
    source: "n01",
    kind: "n01_match",
    title: opts.summary?.title ?? opts.tmid,
    sourceUrl: opts.url,
    identity,
    matches: [match],
  };
}
