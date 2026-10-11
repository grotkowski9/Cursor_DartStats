import {
  backupToStorage,
  computeShareToken,
  type N01Leg,
  type N01Match,
  type N01Player,
  type N01Visit,
} from "@/lib/n01-parser";
import type { CustomerProfile } from "@/lib/customer";
import { formatCustomerDisplayName } from "@/lib/customer";
import { customerPatterns, personMatchesPatterns, resolveCandidates } from "@/lib/sources/identity";
import { prdAuthFailed, resetPrdConfigCache, resolvePrdConfig } from "@/lib/sources/prd-config";
import type {
  GroupIdentity,
  ParticipantCandidate,
  PreviewGroup,
  PreviewMatch,
} from "@/lib/sources/types";

export const PRD_ID_PREFIX = "prd:";

export function prdExternalId(matchId: string): string {
  return `${PRD_ID_PREFIX}${matchId}`;
}

export function stripPrdPrefix(externalId: string): string {
  return externalId.startsWith(PRD_ID_PREFIX)
    ? externalId.slice(PRD_ID_PREFIX.length)
    : externalId;
}

type PrdProfile = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  nickname: string | null;
  city?: string | null;
};

type PrdThrow = {
  score?: number;
  darts?: number;
  remaining?: number;
  remainingBefore?: number;
  checkout?: boolean;
  bust?: boolean;
};

type PrdLeg = {
  winner?: string | number | null;
  startingPlayer?: number;
  players?: {
    p1?: { throws?: PrdThrow[] };
    p2?: { throws?: PrdThrow[] };
  };
};

type PrdLiveSlot = {
  average?: number;
  totalPoints?: number;
  dartsThrown?: number;
};

type PrdMatchData = {
  legs?: PrdLeg[];
  score1?: number;
  score2?: number;
  starting_points?: number;
  liveStats?: { p1?: PrdLiveSlot; p2?: PrdLiveSlot };
};

export type PrdRawMatch = {
  id: string;
  player1: string | null;
  player2: string | null;
  score1: number | null;
  score2: number | null;
  winner: string | null;
  status: string | null;
  created_at?: string;
  starting_points?: number | null;
  match_data?: PrdMatchData | null;
  p1?: PrdProfile | null;
  p2?: PrdProfile | null;
};

export type PrdTournament = {
  id: string;
  name: string;
  slug: string;
  date: string | null;
  starting_points: number | null;
  city?: string | null;
};

async function prdGetOnce<T>(
  path: string,
  params: Record<string, string>,
  url: string,
  key: string,
): Promise<{ ok: true; data: T } | { ok: false; status: number; body: string }> {
  const target = new URL(`${url}/rest/v1/${path}`);
  for (const [k, v] of Object.entries(params)) target.searchParams.set(k, v);
  const res = await fetch(target, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      Accept: "application/json",
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    return { ok: false, status: res.status, body };
  }
  return { ok: true, data: (await res.json()) as T };
}

async function prdGet<T>(path: string, params: Record<string, string>): Promise<T> {
  const first = await resolvePrdConfig();
  const attempt = await prdGetOnce<T>(path, params, first.url, first.key);
  if (attempt.ok) return attempt.data;

  if (prdAuthFailed(attempt.status)) {
    resetPrdConfigCache();
    const again = await resolvePrdConfig({ forceDiscover: true });
    if (again.url !== first.url || again.key !== first.key) {
      const retry = await prdGetOnce<T>(path, params, again.url, again.key);
      if (retry.ok) return retry.data;
      throw new Error(
        `PRD ${path} ${retry.status}${retry.body ? `: ${retry.body.slice(0, 180)}` : ""}`,
      );
    }
  }

  throw new Error(
    `PRD ${path} ${attempt.status}${attempt.body ? `: ${attempt.body.slice(0, 180)}` : ""}`,
  );
}

const PROFILE_EMBED =
  "id,first_name,last_name,nickname,city";

export function formatPrdName(p: PrdProfile | null | undefined): string {
  if (!p) return "Nieznany";
  return formatCustomerDisplayName({
    firstName: p.first_name?.trim() || "?",
    lastName: p.last_name?.trim() || "",
    nickname: p.nickname,
  });
}

export async function fetchPrdTournamentBySlug(slug: string): Promise<PrdTournament> {
  const rows = await prdGet<PrdTournament[]>("tournaments", {
    slug: `eq.${slug}`,
    select: "id,name,slug,date,starting_points,city",
    limit: "1",
  });
  const row = rows[0];
  if (!row) throw new Error("Nie znaleziono turnieju PRD pod tym linkiem.");
  return row;
}

export async function fetchPrdTournamentById(id: string): Promise<PrdTournament> {
  const rows = await prdGet<PrdTournament[]>("tournaments", {
    id: `eq.${id}`,
    select: "id,name,slug,date,starting_points,city",
    limit: "1",
  });
  const row = rows[0];
  if (!row) throw new Error("Nie znaleziono turnieju PRD.");
  return row;
}

export async function fetchPrdParticipants(tournamentId: string): Promise<ParticipantCandidate[]> {
  const rows = await prdGet<
    { user_id: string | null; p: PrdProfile | null }[]
  >("participants", {
    tournament_id: `eq.${tournamentId}`,
    select: `user_id,p:profiles!participants_user_fk(${PROFILE_EMBED})`,
    limit: "1000",
  });
  const out: ParticipantCandidate[] = [];
  for (const row of rows) {
    if (!row.user_id || !row.p) continue;
    out.push({
      id: row.user_id,
      displayName: formatPrdName(row.p),
      nickname: row.p.nickname,
      city: row.p.city,
    });
  }
  return out;
}

const MATCH_SELECT = `id,player1,player2,score1,score2,winner,status,created_at,match_data,p1:profiles!fk_player1(${PROFILE_EMBED}),p2:profiles!fk_player2(${PROFILE_EMBED})`;

export async function fetchPrdPlayerMatches(
  tournamentId: string,
  playerId: string,
): Promise<{ group: PrdRawMatch[]; knockout: PrdRawMatch[] }> {
  const filter = {
    tournament_id: `eq.${tournamentId}`,
    or: `(player1.eq.${playerId},player2.eq.${playerId})`,
    status: "eq.finished",
    select: MATCH_SELECT,
    order: "created_at.asc",
    limit: "500",
  };
  const [group, knockout] = await Promise.all([
    prdGet<PrdRawMatch[]>("group_matches", filter),
    prdGet<PrdRawMatch[]>("knockout_matches", filter),
  ]);
  return { group, knockout };
}

export async function fetchPrdMatch(
  kind: "group" | "knockout",
  matchId: string,
): Promise<PrdRawMatch> {
  const table = kind === "group" ? "group_matches" : "knockout_matches";
  const rows = await prdGet<PrdRawMatch[]>(table, {
    id: `eq.${matchId}`,
    select: MATCH_SELECT,
    limit: "1",
  });
  const row = rows[0];
  if (!row) throw new Error("Nie znaleziono meczu PRD.");
  return row;
}

export function pickPrdIdentity(
  participants: ParticipantCandidate[],
  customer: CustomerProfile,
): GroupIdentity {
  const patterns = customerPatterns(customer);
  const matched = participants.filter((p) =>
    personMatchesPatterns(
      { displayName: p.displayName, nickname: p.nickname },
      patterns,
    ),
  );
  return resolveCandidates(
    matched,
    "Nie znalazłem Cię w tym turnieju PRD. Wybierz siebie z listy albo pomiń grupę.",
  );
}

function throwsToVisits(throws: PrdThrow[] | undefined, startScore: number): N01Visit[] {
  const setup: N01Visit = {
    score: 0,
    left: startScore,
    actualScore: 0,
    darts: 0,
    isCheckout: false,
    isBust: false,
    isSetup: true,
  };
  const rest = (throws ?? []).map((t) => {
    const bust = Boolean(t.bust);
    const score = Number(t.score ?? 0);
    return {
      score,
      left: Number(t.remaining ?? 0),
      actualScore: bust ? 0 : score,
      darts: Number(t.darts ?? 3),
      isCheckout: Boolean(t.checkout),
      isBust: bust,
      isSetup: false,
    };
  });
  return [setup, ...rest];
}

function slotFromWinner(winner: string | number | null | undefined): 0 | 1 | -1 {
  if (winner === "p1" || winner === 1 || winner === "1") return 0;
  if (winner === "p2" || winner === 2 || winner === "2") return 1;
  return -1;
}

export function prdMatchToN01(
  raw: PrdRawMatch,
  opts: {
    tournament: PrdTournament;
    playerId: string;
    snapshotPath: string;
    htmlSnapshotPath: string | null;
    shareToken: string;
  },
): N01Match {
  const startScore = raw.starting_points ?? opts.tournament.starting_points ?? 501;
  const meIsP1 = raw.player1 === opts.playerId;
  const playerIndex: 0 | 1 = meIsP1 ? 0 : 1;
  const md = raw.match_data ?? {};
  const p1 = raw.p1;
  const p2 = raw.p2;
  const s1 = raw.score1 ?? md.score1 ?? 0;
  const s2 = raw.score2 ?? md.score2 ?? 0;

  const live1 = md.liveStats?.p1;
  const live2 = md.liveStats?.p2;

  const players: [N01Player, N01Player] = [
    {
      name: formatPrdName(p1),
      winLegs: s1,
      allScore: live1?.totalPoints ?? 0,
      allDarts: live1?.dartsThrown ?? 0,
      average: live1?.average ?? 0,
      isMe: playerIndex === 0,
    },
    {
      name: formatPrdName(p2),
      winLegs: s2,
      allScore: live2?.totalPoints ?? 0,
      allDarts: live2?.dartsThrown ?? 0,
      average: live2?.average ?? 0,
      isMe: playerIndex === 1,
    },
  ];

  const legs: N01Leg[] = (md.legs ?? []).map((leg, i) => ({
    index: i + 1,
    winner: slotFromWinner(leg.winner),
    first: leg.startingPlayer === 2 ? 1 : 0,
    visits: [
      throwsToVisits(leg.players?.p1?.throws, startScore),
      throwsToVisits(leg.players?.p2?.throws, startScore),
    ],
  }));

  const startMs = raw.created_at
    ? Date.parse(raw.created_at)
    : opts.tournament.date
      ? Date.parse(opts.tournament.date)
      : Date.now();

  const title = opts.tournament.name.trim();

  return {
    tmid: prdExternalId(raw.id),
    ttype: "tournament",
    title,
    startTime: Math.floor(startMs / 1000),
    updateTime: Math.floor(startMs / 1000),
    startScore,
    players,
    legs,
    snapshotPath: opts.snapshotPath,
    htmlSnapshotPath: opts.htmlSnapshotPath,
    playerIndex,
    shareToken: opts.shareToken,
    rawPayload: raw as unknown,
    source: "prd",
  };
}

export async function parseAndBackupPrd(opts: {
  raw: PrdRawMatch;
  tournament: PrdTournament;
  playerId: string;
  customerId: string;
}): Promise<N01Match> {
  const externalId = prdExternalId(opts.raw.id);
  const jsonText = JSON.stringify(opts.raw);
  const shareToken = await computeShareToken(opts.customerId, externalId);
  const { snapshotPath, htmlSnapshotPath } = await backupToStorage(
    opts.customerId,
    "tournament",
    externalId.replace(/[^A-Za-z0-9:_-]/g, "_"),
    jsonText,
    null,
  );
  return prdMatchToN01(opts.raw, {
    tournament: opts.tournament,
    playerId: opts.playerId,
    snapshotPath,
    htmlSnapshotPath,
    shareToken,
  });
}

export function previewMatchesFromPrd(opts: {
  tournament: PrdTournament;
  sourceUrl: string;
  playerId: string;
  group: PrdRawMatch[];
  knockout: PrdRawMatch[];
  existing: Map<string, string>;
}): PreviewMatch[] {
  const rows: { raw: PrdRawMatch; kind: "group" | "knockout" }[] = [
    ...opts.group.map((raw) => ({ raw, kind: "group" as const })),
    ...opts.knockout.map((raw) => ({ raw, kind: "knockout" as const })),
  ];
  return rows.map(({ raw, kind }) => {
    const meIsP1 = raw.player1 === opts.playerId;
    const myScore = meIsP1 ? raw.score1 : raw.score2;
    const oppScore = meIsP1 ? raw.score2 : raw.score1;
    const opp = formatPrdName(meIsP1 ? raw.p2 : raw.p1);
    const externalId = prdExternalId(raw.id);
    const share = opts.existing.get(externalId) ?? null;
    const startMs = raw.created_at
      ? Date.parse(raw.created_at)
      : opts.tournament.date
        ? Date.parse(opts.tournament.date)
        : null;
    return {
      source: "prd" as const,
      externalId,
      opponent: opp,
      myScore,
      oppScore,
      startTime: startMs ? Math.floor(startMs / 1000) : null,
      startScore: raw.starting_points ?? opts.tournament.starting_points ?? 501,
      alreadyInDb: Boolean(share),
      shareToken: share,
      selected: !share,
      fetchRef: {
        source: "prd",
        matchId: raw.id,
        tournamentId: opts.tournament.id,
        kind,
      },
      playerIndex: meIsP1 ? 0 : 1,
    };
  });
}

export function buildPrdPreviewGroup(opts: {
  tournament: PrdTournament;
  sourceUrl: string;
  identity: GroupIdentity;
  matches: PreviewMatch[];
}): PreviewGroup {
  return {
    groupKey: `prd:${opts.tournament.id}`,
    source: "prd",
    kind: "prd_tournament",
    title: opts.tournament.name.trim(),
    sourceUrl: opts.sourceUrl,
    identity: opts.identity,
    matches: opts.matches,
  };
}
