import { describe, expect, it } from "vitest";
import {
  assembleMatchesFromRows,
  rowsToN01Match,
} from "@/lib/matches";
import { parseN01Payload, type N01Match } from "@/lib/n01-parser";
import { computeMatchStats, computePlayerStats } from "@/lib/stats";
import type { Tables, Json } from "@/types/database";
import sample from "./fixtures/n01-sample.json";

type MatchRow = Tables<"matches">;
type LegRow = Tables<"legs">;
type VisitRow = Tables<"visits">;

async function goldenMatch(playerIndex: 0 | 1, shareToken: string): Promise<N01Match> {
  return parseN01Payload(sample as Record<string, unknown>, {
    tmid: `${String(sample.tmid)}-${shareToken}`,
    ttype: "tournament",
    snapshotPath: `snap/${shareToken}.json`,
    htmlSnapshotPath: null,
    shareToken,
    playerIndex,
  });
}

/** Convert parsed matches into flat DB-shaped rows (like Supabase returns). */
function matchesToRows(matches: N01Match[]): {
  matchRows: MatchRow[];
  legRows: LegRow[];
  visitRows: VisitRow[];
} {
  const matchRows: MatchRow[] = [];
  const legRows: LegRow[] = [];
  const visitRows: VisitRow[] = [];
  let visitId = 1;

  for (let mi = 0; mi < matches.length; mi++) {
    const m = matches[mi];
    const matchId = m.matchId ?? `00000000-0000-4000-8000-${String(mi).padStart(12, "0")}`;
    const idx = m.playerIndex;
    const stats = computeMatchStats(m);
    const oppIdx = idx === 0 ? 1 : 0;

    matchRows.push({
      match_id: matchId,
      customer_id: "cust-test",
      n01_tmid: m.tmid,
      match_type: m.ttype,
      title: m.title,
      opponent_name: idx === null ? null : m.players[oppIdx].name,
      start_time: new Date(m.startTime * 1000).toISOString(),
      update_time: m.updateTime ? new Date(m.updateTime * 1000).toISOString() : null,
      start_score: m.startScore,
      player_index: idx,
      player_legs_won: idx === null ? null : m.players[idx].winLegs,
      opponent_legs_won: idx === null ? null : m.players[oppIdx].winLegs,
      player_average: idx === null ? null : stats.me.average,
      player_first9: idx === null ? null : stats.me.first9,
      player_checkout_pct: idx === null ? null : stats.me.checkoutRate,
      players: m.players as unknown as Json,
      raw_payload: null,
      snapshot_path: m.snapshotPath,
      html_snapshot_path: m.htmlSnapshotPath,
      share_token: m.shareToken,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    for (const leg of m.legs) {
      const legId = `${matchId}-leg-${leg.index}`;
      legRows.push({
        leg_id: legId,
        match_id: matchId,
        leg_number: leg.index,
        winner_index: leg.winner,
        first_player: leg.first,
        created_at: new Date().toISOString(),
      });

      for (const pIdx of [0, 1] as const) {
        leg.visits[pIdx].forEach((v, vIdx) => {
          visitRows.push({
            visit_id: visitId++,
            leg_id: legId,
            player_index: pIdx,
            visit_number: vIdx,
            raw_score: v.score,
            left_after: v.left,
            actual_score: v.actualScore,
            darts_thrown: v.darts,
            is_checkout: v.isCheckout,
            is_bust: v.isBust,
            is_setup: v.isSetup,
          });
        });
      }
    }
  }

  return { matchRows, legRows, visitRows };
}

describe("assembleMatchesFromRows (bulk = sequential)", () => {
  it("bulk assembly equals per-match rowsToN01Match", async () => {
    const a = await goldenMatch(1, "tokenaaaaaaaaaaaa");
    const b = await goldenMatch(0, "tokenbbbbbbbbbbbb");
    // Shuffle visit insertion order later — assembly must still sort correctly
    const { matchRows, legRows, visitRows } = matchesToRows([a, b]);

    // Deliberately scramble visit order (as a messy bulk query might)
    const scrambled = visitRows.slice().reverse();

    const sequential = matchRows.map((row) => {
      const legs = legRows.filter((l) => l.match_id === row.match_id);
      const legIds = new Set(legs.map((l) => l.leg_id));
      const visits = scrambled.filter((v) => legIds.has(v.leg_id));
      return rowsToN01Match(row, legs, visits);
    });

    const bulk = assembleMatchesFromRows(matchRows, legRows, scrambled);

    expect(bulk).toHaveLength(2);
    expect(bulk).toEqual(sequential);
  });

  it("stats identical after round-trip through DB rows", async () => {
    const match = await goldenMatch(1, "tokencccccccccccc");
    const before = computeMatchStats(match);
    const playerBefore = computePlayerStats([match]);

    const { matchRows, legRows, visitRows } = matchesToRows([match]);
    const [restored] = assembleMatchesFromRows(matchRows, legRows, visitRows);

    const after = computeMatchStats(restored);
    const playerAfter = computePlayerStats([restored]);

    expect(after.me.average).toBe(before.me.average);
    expect(after.me.first9).toBe(before.me.first9);
    expect(after.me.checkoutRate).toBe(before.me.checkoutRate);
    expect(after.me.legsWon).toBe(before.me.legsWon);
    expect(after.won).toBe(before.won);
    expect(after.legs.length).toBe(before.legs.length);
    expect(after.legs.map((l) => l.darts)).toEqual(before.legs.map((l) => l.darts));
    expect(playerAfter).toEqual(playerBefore);
  });

  it("preserves match order from matches array", async () => {
    const newer = await goldenMatch(1, "tokendddddddddddd");
    const older = await goldenMatch(1, "tokeneeeeeeeeeeee");
    newer.startTime = 2_000_000_000;
    older.startTime = 1_000_000_000;

    const { matchRows, legRows, visitRows } = matchesToRows([newer, older]);
    const bulk = assembleMatchesFromRows(matchRows, legRows, visitRows);
    expect(bulk.map((m) => m.shareToken)).toEqual([
      "tokendddddddddddd",
      "tokeneeeeeeeeeeee",
    ]);
  });
});
