import { DEMO_PERSONA, demoShareToken } from "@/demo/demo-persona";
import { AUTO_DETECT_PATTERNS, DEMO_CUSTOMER_ID } from "@/lib/constants";
import { detectPlayerIndex, applyPlayerIndex } from "@/lib/player-detect";
import type { N01Match, N01Player } from "@/lib/n01-parser";
import { backupToStorage, fetchN01Payload, parseN01Payload } from "@/lib/n01-parser";

/** 3 mecze z tym samym przeciwnikiem */
const OPPONENT_TRIPLE = "CEGLAR Stanisław / Wrocław";
/** 2 mecze z tym samym przeciwnikiem */
const OPPONENT_DOUBLE = "WIATR Adam / Gdańsk";

const OPPONENT_SOLO = [
  "NAZIEMSKI Jan / Poznań",
  "ORZEŁ Michał / Lublin",
  "PAWEŁCZYK Tomek / Rzeszów",
  "JANIK Krzysztof / Białystok",
  "SOBCZAK Paweł / Szczecin",
] as const;

/** Indeksy w rankingu od najnowszego — 3 porażki, w tym drugi mecz (indeks 1) */
const LOSS_RANK_INDICES = new Set([1, 6, 9]);

/** Indeksy od najnowszego — 3× ten sam, 2× ten sam */
const TRIPLE_RANK_INDICES = new Set([0, 2, 5]);
const DOUBLE_RANK_INDICES = new Set([7, 8]);

export async function fetchDemoMatchFromUrl(url: string, index: number): Promise<N01Match> {
  const { payload, jsonText, htmlText, tmid, ttype } = await fetchN01Payload(url);
  const shareToken = demoShareToken(index);
  const { snapshotPath, htmlSnapshotPath } = await backupToStorage(
    DEMO_CUSTOMER_ID,
    ttype,
    tmid,
    jsonText,
    htmlText,
  );

  const match = await parseN01Payload(payload, {
    tmid,
    ttype,
    snapshotPath,
    htmlSnapshotPath,
    shareToken,
    playerIndex: null,
  });

  return anonymizeDemoMatch(match, index);
}

export function sanitizeDemoTitle(_title: string): string {
  return "Turniej Przykładowy";
}

export function anonymizeDemoMatch(match: N01Match, index: number): N01Match {
  const players = match.players.map((p) => ({ ...p })) as [N01Player, N01Player];

  let meIdx = match.playerIndex;
  if (meIdx === null) {
    const detection = detectPlayerIndex(
      [players[0].name, players[1].name],
      [...AUTO_DETECT_PATTERNS],
    );
    meIdx = detection.status === "auto" ? detection.playerIndex : 0;
  }

  players[meIdx] = {
    ...players[meIdx],
    name: DEMO_PERSONA.n01Name,
    isMe: true,
  };
  players[meIdx === 0 ? 1 : 0] = {
    ...players[meIdx === 0 ? 1 : 0],
    isMe: false,
  };

  applyPlayerIndex(players, meIdx);

  const shareToken = match.shareToken || demoShareToken(index);

  return {
    ...match,
    title: sanitizeDemoTitle(match.title),
    tmid: `demo_${match.tmid}`,
    players,
    playerIndex: meIdx,
    shareToken,
  };
}

/** Przenieś „moje konto” na drugą stronę — bez podmiany wizyt (tylko perspektywa wyniku). */
export function flipDemoPlayerSide(match: N01Match): N01Match {
  const meIdx = match.playerIndex ?? 0;
  const newMeIdx = (meIdx === 0 ? 1 : 0) as 0 | 1;
  const players = match.players.map((p) => ({ ...p })) as [N01Player, N01Player];

  players[newMeIdx] = {
    ...players[newMeIdx],
    name: DEMO_PERSONA.n01Name,
    isMe: true,
  };
  players[meIdx] = {
    ...players[meIdx],
    isMe: false,
  };

  return recomputePlayersFromLegs({ ...match, players, playerIndex: newMeIdx });
}

function opponentForRank(rankIndex: number): string {
  if (TRIPLE_RANK_INDICES.has(rankIndex)) return OPPONENT_TRIPLE;
  if (DOUBLE_RANK_INDICES.has(rankIndex)) return OPPONENT_DOUBLE;
  const soloIdx =
    [1, 3, 4, 6, 9].indexOf(rankIndex) >= 0
      ? [1, 3, 4, 6, 9].indexOf(rankIndex)
      : rankIndex % OPPONENT_SOLO.length;
  return OPPONENT_SOLO[soloIdx] ?? OPPONENT_SOLO[0];
}

function sumPlayerFromLegs(match: N01Match, playerIdx: 0 | 1) {
  const visits = match.legs.flatMap((l) => l.visits[playerIdx]);
  let allScore = 0;
  let allDarts = 0;
  for (const v of visits) {
    if (v.isSetup) continue;
    allScore += v.actualScore;
    allDarts += v.darts;
  }
  return {
    allScore,
    allDarts,
    average: allDarts > 0 ? Math.round((allScore / allDarts) * 3 * 100) / 100 : 0,
    winLegs: match.legs.filter((l) => l.winner === playerIdx).length,
  };
}

function recomputePlayersFromLegs(match: N01Match): N01Match {
  const meIdx = match.playerIndex ?? 0;
  const oppIdx = (meIdx === 0 ? 1 : 0) as 0 | 1;
  const players = match.players.map((p) => ({ ...p })) as [N01Player, N01Player];
  const meStats = sumPlayerFromLegs(match, meIdx);
  const oppStats = sumPlayerFromLegs(match, oppIdx);

  players[meIdx] = {
    ...players[meIdx],
    ...meStats,
    name: DEMO_PERSONA.n01Name,
    isMe: true,
  };
  players[oppIdx] = {
    ...players[oppIdx],
    ...oppStats,
    isMe: false,
  };

  return { ...match, players };
}

function demoIsWinning(match: N01Match): boolean {
  const meIdx = match.playerIndex ?? 0;
  const meLegs = match.legs.filter((l) => l.winner === meIdx).length;
  const oppLegs = match.legs.filter((l) => l.winner !== meIdx).length;
  return meLegs > oppLegs;
}

function setOpponentName(match: N01Match, opponentName: string): N01Match {
  const meIdx = match.playerIndex ?? 0;
  const oppIdx = meIdx === 0 ? 1 : 0;
  const players = match.players.map((p) => ({ ...p })) as [N01Player, N01Player];
  players[oppIdx] = { ...players[oppIdx], name: opponentName, isMe: false };
  return { ...match, players };
}

/** Daty, porażki, anonimizacja tytułu i przeciwników — po applyDemoDates. */
export function polishDemoDataset(matches: N01Match[]): N01Match[] {
  const byNewest = [...matches].sort((a, b) => b.startTime - a.startTime);
  const rankByToken = new Map(byNewest.map((m, i) => [m.shareToken, i]));

  return matches.map((match) => {
    const rank = rankByToken.get(match.shareToken) ?? 0;
    let m = { ...match, title: sanitizeDemoTitle(match.title) };

    const shouldLose = LOSS_RANK_INDICES.has(rank);
    const winning = demoIsWinning(m);
    if (shouldLose === winning) {
      m = flipDemoPlayerSide(m);
    }

    m = setOpponentName(m, opponentForRank(rank));
    return recomputePlayersFromLegs(m);
  });
}
