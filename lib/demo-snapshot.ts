import type { N01Match } from "@/lib/n01-parser";
import { applyDemoDates } from "@/lib/demo-dates";
import {
  computeCheckoutDistribution,
  computeDayStats,
  computeFormSeries,
  computeHourStats,
  computeLast5,
  computeMatchStats,
  computePlayerStats,
  computeTopCheckouts,
  computeTopThrows,
  filterByRange,
  normalizeName,
  type CheckoutBucket,
  type DayStats,
  type FormPoint,
  type HourStats,
  type MatchStats,
  type PlayerStats,
  type RecentMatch,
  type TimeRange,
  type TopThrow,
} from "@/lib/stats";

const DEMO_RANGES: TimeRange[] = ["30d", "90d", "180d", "365d", "all"];

export type DemoH2HStats = {
  stats: PlayerStats;
  oppStats: PlayerStats;
};

export type DemoRangeSnapshot = {
  matches: N01Match[];
  playerStats: PlayerStats;
  topThrows: TopThrow[];
  topCheckouts: TopThrow[];
  recent: RecentMatch[];
  formSeries: FormPoint[];
  dayStats: DayStats[];
  hourStats: HourStats[];
  checkoutBuckets: CheckoutBucket[];
  opponents: { name: string; count: number }[];
  h2hByOpponent: Record<string, DemoH2HStats>;
};

export type DemoProfileSnapshot = {
  generatedAt: string;
  matchCount: number;
  shareTokens: string[];
  matches: N01Match[];
  matchStatsByToken: Record<string, MatchStats>;
  byRange: Record<TimeRange, DemoRangeSnapshot>;
};

function buildOpponents(matches: N01Match[]): { name: string; count: number }[] {
  const names = new Map<string, number>();
  for (const m of matches) {
    if (m.playerIndex === null) continue;
    const oppIdx = m.playerIndex === 0 ? 1 : 0;
    const name = normalizeName(m.players[oppIdx].name);
    names.set(name, (names.get(name) ?? 0) + 1);
  }
  return Array.from(names.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([name, count]) => ({ name, count }));
}

function buildH2H(matches: N01Match[]): Record<string, DemoH2HStats> {
  const out: Record<string, DemoH2HStats> = {};
  for (const { name } of buildOpponents(matches)) {
    const h2hMatches = matches.filter((m) => {
      if (m.playerIndex === null) return false;
      const oppIdx = m.playerIndex === 0 ? 1 : 0;
      return normalizeName(m.players[oppIdx].name) === name;
    });
    if (!h2hMatches.length) continue;
    const stats = computePlayerStats(h2hMatches);
    const flipped = h2hMatches.map((m) => {
      const oppIdx = (m.playerIndex === 0 ? 1 : 0) as 0 | 1;
      return { ...m, playerIndex: oppIdx } as N01Match;
    });
    out[name] = { stats, oppStats: computePlayerStats(flipped) };
  }
  return out;
}

function buildRangeSnapshot(allMatches: N01Match[], range: TimeRange): DemoRangeSnapshot {
  const filtered = filterByRange(allMatches, range);
  const matches = filtered.slice().sort((a, b) => b.startTime - a.startTime);

  return {
    matches,
    playerStats: computePlayerStats(filtered),
    topThrows: computeTopThrows(filtered, 10),
    topCheckouts: computeTopCheckouts(filtered, 10),
    recent: computeLast5(filtered),
    formSeries: computeFormSeries(filtered),
    dayStats: computeDayStats(filtered),
    hourStats: computeHourStats(filtered),
    checkoutBuckets: computeCheckoutDistribution(filtered),
    opponents: buildOpponents(filtered),
    h2hByOpponent: buildH2H(filtered),
  };
}

/** Odświeża tylko daty meczów względem „teraz” — statystyki byRange bez zmian. */
export function refreshDemoSnapshotDates(
  snapshot: DemoProfileSnapshot,
  now = new Date(),
): DemoProfileSnapshot {
  const matches = applyDemoDates(snapshot.matches, now);
  const byToken = new Map(matches.map((m) => [m.shareToken, m]));

  const byRange = {} as Record<TimeRange, DemoRangeSnapshot>;
  for (const range of DEMO_RANGES) {
    const data = snapshot.byRange[range];
    const rangeMatches = data.matches.map((m) => byToken.get(m.shareToken) ?? m);
    byRange[range] = {
      ...data,
      matches: rangeMatches,
      recent: data.recent.map((r) => ({
        ...r,
        startTime: byToken.get(r.shareToken)?.startTime ?? r.startTime,
      })),
      formSeries: data.formSeries.map((fp) => {
        const m = byToken.get(fp.shareToken);
        if (!m) return fp;
        const d = new Date(m.startTime * 1000);
        return {
          ...fp,
          startTime: m.startTime,
          dateLabel: `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}`,
        };
      }),
    };
  }

  return { ...snapshot, matches, byRange };
}

export function buildDemoProfileSnapshot(matches: N01Match[]): DemoProfileSnapshot {
  const sorted = matches.slice().sort((a, b) => a.shareToken.localeCompare(b.shareToken));
  const matchStatsByToken: Record<string, MatchStats> = {};
  for (const m of sorted) {
    matchStatsByToken[m.shareToken] = computeMatchStats(m);
  }

  const byRange = {} as Record<TimeRange, DemoRangeSnapshot>;
  for (const range of DEMO_RANGES) {
    byRange[range] = buildRangeSnapshot(sorted, range);
  }

  return {
    generatedAt: new Date().toISOString(),
    matchCount: sorted.length,
    shareTokens: sorted.map((m) => m.shareToken),
    matches: sorted,
    matchStatsByToken,
    byRange,
  };
}

export const DEMO_TIME_RANGES = DEMO_RANGES;
