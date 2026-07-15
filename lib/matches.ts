import { TMID_REGEX } from "@/lib/constants";
import { autoDetectPatterns, getCustomerById } from "@/lib/customer";
import {
  parseAndBackupN01,
  extractTmidFromUrl,
  type N01Match,
  type N01Player,
  type N01Visit,
} from "@/lib/n01-parser";
import { detectPlayerIndex } from "@/lib/player-detect";
import { computeMatchStats } from "@/lib/stats";
import { getSupabaseAdmin } from "@/lib/supabase/admin";
import type { Tables, TablesInsert, Json } from "@/types/database";

type MatchRow = Tables<"matches">;
type LegRow = Tables<"legs">;
type VisitRow = Tables<"visits">;

function toTimestamptz(ts: number): string {
  const ms = ts > 1e12 ? ts : ts * 1000;
  return new Date(ms).toISOString();
}

function opponentName(players: [N01Player, N01Player], playerIndex: 0 | 1 | null): string | null {
  if (playerIndex === 0) return players[1]?.name ?? null;
  if (playerIndex === 1) return players[0]?.name ?? null;
  return null;
}

function rowsToN01Match(match: MatchRow, legs: LegRow[], visits: VisitRow[]): N01Match {
  const buckets = new Map<string, N01Visit[]>();
  for (const v of visits) {
    const key = `${v.leg_id}:${v.player_index}`;
    let arr = buckets.get(key);
    if (!arr) {
      arr = [];
      buckets.set(key, arr);
    }
    arr.push({
      score: v.raw_score,
      left: v.left_after,
      actualScore: v.actual_score,
      darts: v.darts_thrown,
      isCheckout: v.is_checkout,
      isBust: v.is_bust,
      isSetup: v.is_setup,
    });
  }

  const sortedLegs = legs.slice().sort((a, b) => a.leg_number - b.leg_number);
  const parsedLegs = sortedLegs.map((l) => ({
    index: l.leg_number,
    winner: l.winner_index,
    first: l.first_player,
    visits: [
      buckets.get(`${l.leg_id}:0`) ?? [],
      buckets.get(`${l.leg_id}:1`) ?? [],
    ] as [N01Visit[], N01Visit[]],
  }));

  const players = (match.players as N01Player[]) ?? [];
  const playerIndex =
    match.player_index === 0 || match.player_index === 1
      ? (match.player_index as 0 | 1)
      : null;

  return {
    tmid: match.n01_tmid,
    ttype: match.match_type as "league" | "tournament",
    title: match.title,
    startTime: Math.floor(new Date(match.start_time).getTime() / 1000),
    updateTime: match.update_time ? Math.floor(new Date(match.update_time).getTime() / 1000) : 0,
    startScore: match.start_score,
    players: [players[0], players[1]] as [N01Player, N01Player],
    legs: parsedLegs,
    snapshotPath: match.snapshot_path,
    htmlSnapshotPath: match.html_snapshot_path,
    playerIndex,
    shareToken: match.share_token,
  };
}

async function loadMatchById(matchId: string): Promise<N01Match | null> {
  const supabase = getSupabaseAdmin();
  const { data: match, error } = await supabase
    .from("matches")
    .select("*")
    .eq("match_id", matchId)
    .maybeSingle();
  if (error) throw new Error(`loadMatch: ${error.message}`);
  if (!match) return null;

  const { data: legs } = await supabase
    .from("legs")
    .select("*")
    .eq("match_id", matchId)
    .order("leg_number");

  const legIds = (legs ?? []).map((l) => l.leg_id);
  const { data: visits } = legIds.length
    ? await supabase
        .from("visits")
        .select("*")
        .in("leg_id", legIds)
        .order("visit_number")
    : { data: [] as VisitRow[] };

  return rowsToN01Match(match, legs ?? [], visits ?? []);
}

export async function saveMatch(
  m: N01Match,
  customerId: string,
): Promise<{ matchId: string }> {
  if (m.playerIndex !== 0 && m.playerIndex !== 1) {
    throw new Error("Nie można zapisać meczu bez potwierdzonej tożsamości gracza");
  }

  const supabase = getSupabaseAdmin();
  const stats = computeMatchStats(m);
  const idx = m.playerIndex;
  const oppIdx = idx === 0 ? 1 : 0;

  const { data: matchRow, error: mErr } = await supabase
    .from("matches")
    .upsert(
      {
        customer_id: customerId,
        n01_tmid: m.tmid,
        match_type: m.ttype,
        title: m.title,
        opponent_name: opponentName(m.players, idx),
        start_time: toTimestamptz(m.startTime),
        update_time: m.updateTime ? toTimestamptz(m.updateTime) : null,
        start_score: m.startScore,
        player_index: idx,
        player_legs_won: m.players[idx].winLegs,
        opponent_legs_won: m.players[oppIdx].winLegs,
        player_average: stats.me.average,
        player_first9: stats.me.first9,
        player_checkout_pct: stats.me.checkoutRate,
        players: m.players as Json,
        raw_payload: (m.rawPayload ?? null) as Json | null,
        snapshot_path: m.snapshotPath,
        html_snapshot_path: m.htmlSnapshotPath,
        share_token: m.shareToken,
      },
      { onConflict: "customer_id,n01_tmid" },
    )
    .select("match_id")
    .single();

  if (mErr || !matchRow) throw new Error(`saveMatch: ${mErr?.message ?? "no row"}`);

  await supabase.from("legs").delete().eq("match_id", matchRow.match_id);

  for (const leg of m.legs) {
    const { data: legRow, error: lErr } = await supabase
      .from("legs")
      .insert({
        match_id: matchRow.match_id,
        leg_number: leg.index,
        winner_index: leg.winner,
        first_player: leg.first,
      })
      .select("leg_id")
      .single();
    if (lErr || !legRow) throw new Error(`saveLeg: ${lErr?.message ?? "no row"}`);

    const visitRows: TablesInsert<"visits">[] = [];
    for (const [pIdx, playerVisits] of leg.visits.entries()) {
      playerVisits.forEach((v, vIdx) => {
        visitRows.push({
          leg_id: legRow.leg_id,
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
    if (visitRows.length) {
      const { error: vErr } = await supabase.from("visits").insert(visitRows);
      if (vErr) throw new Error(`saveVisits: ${vErr.message}`);
    }
  }

  await supabase.from("share_links").upsert(
    { share_token: m.shareToken, match_id: matchRow.match_id },
    { onConflict: "share_token" },
  );

  const payloadHash = m.snapshotPath.split("_").pop()?.split(".")[0] ?? "";
  await supabase.from("ingest_snapshots").insert({
    match_id: matchRow.match_id,
    customer_id: customerId,
    n01_tmid: m.tmid,
    payload_hash: payloadHash,
    snapshot_path: m.snapshotPath,
    html_snapshot_path: m.htmlSnapshotPath,
  });

  return { matchId: matchRow.match_id };
}

export async function getMyMatches(customerId: string): Promise<N01Match[]> {
  const supabase = getSupabaseAdmin();
  const { data: matches, error } = await supabase
    .from("matches")
    .select("match_id")
    .eq("customer_id", customerId)
    .order("start_time", { ascending: false });
  if (error) throw new Error(`getMyMatches: ${error.message}`);
  if (!matches?.length) return [];

  const out: N01Match[] = [];
  for (const row of matches) {
    const m = await loadMatchById(row.match_id);
    if (m) out.push(m);
  }
  return out;
}

export async function getMatchByShareToken(shareToken: string): Promise<N01Match | null> {
  const supabase = getSupabaseAdmin();
  const { data: shareRow } = await supabase
    .from("share_links")
    .select("match_id")
    .eq("share_token", shareToken)
    .is("revoked_at", null)
    .maybeSingle();
  if (!shareRow) return null;
  return loadMatchById(shareRow.match_id);
}

export type IngestResult =
  | { status: "saved"; match: N01Match }
  | {
      status: "needs_identity_confirmation";
      reason: "ambiguous" | "none";
      players: [string, string];
      tmid: string;
      url: string;
    }
  | { status: "duplicate"; shareToken: string; tmid: string }
  | { status: "rejected" };

function validateTmid(url: string): string {
  const { tmid } = extractTmidFromUrl(url);
  if (!TMID_REGEX.test(tmid)) throw new Error("URL nie zawiera prawidłowego tmid");
  return tmid;
}

export async function ingestAndSave(opts: {
  url: string;
  overwrite?: boolean;
  playerIndex?: 0 | 1;
  action?: "save" | "reject";
  customerId: string;
}): Promise<IngestResult> {
  const customerId = opts.customerId;

  if (opts.action === "reject") {
    return { status: "rejected" };
  }

  const tmid = validateTmid(opts.url);
  const supabase = getSupabaseAdmin();

  if (!opts.overwrite) {
    const { data: existing } = await supabase
      .from("matches")
      .select("share_token")
      .eq("customer_id", customerId)
      .eq("n01_tmid", tmid)
      .maybeSingle();
    if (existing) {
      return { status: "duplicate", shareToken: existing.share_token, tmid };
    }
  }

  let parsed: N01Match;
  try {
    parsed = await parseAndBackupN01(opts.url, opts.playerIndex ?? null, customerId);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (/timeout|timed out|AbortError/i.test(msg)) {
      throw new Error("N01 nie odpowiada (timeout). Spróbuj za chwilę.");
    }
    if (/404|not found/i.test(msg)) throw new Error("N01 nie zna tego meczu (404).");
    throw new Error(`Import z N01 nieudany: ${msg}`);
  }

  const customer = await getCustomerById(customerId);
  const playerDetection = detectPlayerIndex(
    [parsed.players[0].name, parsed.players[1].name],
    customer ? autoDetectPatterns(customer) : [],
  );

  if (opts.playerIndex === 0 || opts.playerIndex === 1) {
    parsed.playerIndex = opts.playerIndex;
    parsed.players[0].isMe = opts.playerIndex === 0;
    parsed.players[1].isMe = opts.playerIndex === 1;
  } else if (playerDetection.status === "auto") {
    parsed.playerIndex = playerDetection.playerIndex;
    parsed.players[0].isMe = playerDetection.playerIndex === 0;
    parsed.players[1].isMe = playerDetection.playerIndex === 1;
  } else {
    return {
      status: "needs_identity_confirmation",
      reason: playerDetection.status,
      players: [parsed.players[0].name, parsed.players[1].name],
      tmid,
      url: opts.url,
    };
  }

  await saveMatch(parsed, customerId);
  return { status: "saved", match: parsed };
}

export type MatchListItem = {
  matchId: string;
  title: string;
  opponentName: string | null;
  startTime: string;
  shareToken: string;
  playerAverage: number | null;
  playerLegsWon: number | null;
  opponentLegsWon: number | null;
};

export async function getMyMatchSummaries(
  customerId: string,
): Promise<MatchListItem[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("matches")
    .select(
      "match_id, title, opponent_name, start_time, share_token, player_average, player_legs_won, opponent_legs_won",
    )
    .eq("customer_id", customerId)
    .order("start_time", { ascending: false });
  if (error) throw new Error(`getMyMatchSummaries: ${error.message}`);
  return (data ?? []).map((r) => ({
    matchId: r.match_id,
    title: r.title,
    opponentName: r.opponent_name,
    startTime: r.start_time,
    shareToken: r.share_token,
    playerAverage: r.player_average,
    playerLegsWon: r.player_legs_won,
    opponentLegsWon: r.opponent_legs_won,
  }));
}
