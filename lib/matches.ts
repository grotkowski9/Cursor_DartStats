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

/** Chunk size for PostgREST `.in(...)` — keeps URL under proxy limits. */
const IN_CHUNK = 100;
/** PostgREST / Supabase default max rows per response — must paginate past this. */
const PAGE_SIZE = 1000;

export function rowsToN01Match(match: MatchRow, legs: LegRow[], visits: VisitRow[]): N01Match {
  // Sort within each leg+player so checkout/last-visit stats stay correct
  // even when bulk queries return visits out of order.
  const buckets = new Map<string, VisitRow[]>();
  for (const v of visits) {
    const key = `${v.leg_id}:${v.player_index}`;
    let arr = buckets.get(key);
    if (!arr) {
      arr = [];
      buckets.set(key, arr);
    }
    arr.push(v);
  }
  for (const arr of buckets.values()) {
    arr.sort((a, b) => a.visit_number - b.visit_number);
  }

  const n01Buckets = new Map<string, N01Visit[]>();
  for (const [key, arr] of buckets) {
    n01Buckets.set(
      key,
      arr.map((v) => ({
        score: v.raw_score,
        left: v.left_after,
        actualScore: v.actual_score,
        darts: v.darts_thrown,
        isCheckout: v.is_checkout,
        isBust: v.is_bust,
        isSetup: v.is_setup,
      })),
    );
  }

  const sortedLegs = legs.slice().sort((a, b) => a.leg_number - b.leg_number);
  const parsedLegs = sortedLegs.map((l) => ({
    index: l.leg_number,
    winner: l.winner_index,
    first: l.first_player,
    visits: [
      n01Buckets.get(`${l.leg_id}:0`) ?? [],
      n01Buckets.get(`${l.leg_id}:1`) ?? [],
    ] as [N01Visit[], N01Visit[]],
  }));

  const players = (match.players as N01Player[]) ?? [];
  const playerIndex =
    match.player_index === 0 || match.player_index === 1
      ? (match.player_index as 0 | 1)
      : null;

  return {
    matchId: match.match_id,
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

/**
 * Assemble N01Match[] from flat DB rows (bulk load path).
 * Same output as loading each match via rowsToN01Match independently.
 * Matches keep the order of the `matches` array (caller orders by start_time).
 */
export function assembleMatchesFromRows(
  matches: MatchRow[],
  legs: LegRow[],
  visits: VisitRow[],
): N01Match[] {
  const legsByMatch = new Map<string, LegRow[]>();
  for (const leg of legs) {
    const arr = legsByMatch.get(leg.match_id) ?? [];
    arr.push(leg);
    legsByMatch.set(leg.match_id, arr);
  }

  const visitsByLeg = new Map<string, VisitRow[]>();
  for (const v of visits) {
    const arr = visitsByLeg.get(v.leg_id) ?? [];
    arr.push(v);
    visitsByLeg.set(v.leg_id, arr);
  }

  return matches.map((match) => {
    const matchLegs = legsByMatch.get(match.match_id) ?? [];
    const matchVisits: VisitRow[] = [];
    for (const leg of matchLegs) {
      const vs = visitsByLeg.get(leg.leg_id);
      if (vs?.length) matchVisits.push(...vs);
    }
    return rowsToN01Match(match, matchLegs, matchVisits);
  });
}

/** Paginate past PostgREST max-rows so bulk loads never silently truncate. */
async function fetchLegsByMatchIds(matchIds: string[]): Promise<LegRow[]> {
  if (!matchIds.length) return [];
  const supabase = getSupabaseAdmin();
  const out: LegRow[] = [];

  for (let i = 0; i < matchIds.length; i += IN_CHUNK) {
    const chunk = matchIds.slice(i, i + IN_CHUNK);
    let from = 0;
    for (;;) {
      const { data, error } = await supabase
        .from("legs")
        .select("*")
        .in("match_id", chunk)
        .order("leg_id")
        .range(from, from + PAGE_SIZE - 1);
      if (error) throw new Error(`getMyMatches legs: ${error.message}`);
      if (!data?.length) break;
      out.push(...data);
      if (data.length < PAGE_SIZE) break;
      from += PAGE_SIZE;
    }
  }
  return out;
}

async function fetchVisitsByLegIds(legIds: string[]): Promise<VisitRow[]> {
  if (!legIds.length) return [];
  const supabase = getSupabaseAdmin();
  const out: VisitRow[] = [];

  for (let i = 0; i < legIds.length; i += IN_CHUNK) {
    const chunk = legIds.slice(i, i + IN_CHUNK);
    let from = 0;
    for (;;) {
      // Order by visit_id (PK) for stable pagination across pages.
      const { data, error } = await supabase
        .from("visits")
        .select("*")
        .in("leg_id", chunk)
        .order("visit_id")
        .range(from, from + PAGE_SIZE - 1);
      if (error) throw new Error(`getMyMatches visits: ${error.message}`);
      if (!data?.length) break;
      out.push(...data);
      if (data.length < PAGE_SIZE) break;
      from += PAGE_SIZE;
    }
  }
  return out;
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

/**
 * Load all matches for a customer with legs + visits in ~3 queries (chunked).
 * Replaces the previous N+1 loop (1 + 3N). Same N01Match shape / stats.
 */
export async function getMyMatches(customerId: string): Promise<N01Match[]> {
  const supabase = getSupabaseAdmin();
  const { data: matches, error } = await supabase
    .from("matches")
    .select("*")
    .eq("customer_id", customerId)
    .order("start_time", { ascending: false });
  if (error) throw new Error(`getMyMatches: ${error.message}`);
  if (!matches?.length) return [];

  const matchIds = matches.map((m) => m.match_id);
  const legs = await fetchLegsByMatchIds(matchIds);
  const visits = await fetchVisitsByLegIds(legs.map((l) => l.leg_id));
  return assembleMatchesFromRows(matches, legs, visits);
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

const MATCH_ID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type DeleteMatchResult =
  | { ok: true }
  | { ok: false; reason: "not_found" | "forbidden" | "invalid_id" };

/**
 * Hard-delete a match owned by customerId.
 * Cascades legs/visits/share_links; removes ingest_snapshots rows + Storage files.
 */
export async function deleteMatch(
  matchId: string,
  customerId: string,
): Promise<DeleteMatchResult> {
  if (!MATCH_ID_RE.test(matchId)) return { ok: false, reason: "invalid_id" };

  const supabase = getSupabaseAdmin();
  const { data: match, error: loadErr } = await supabase
    .from("matches")
    .select("match_id, customer_id, snapshot_path, html_snapshot_path")
    .eq("match_id", matchId)
    .maybeSingle();

  if (loadErr) throw new Error(`deleteMatch load: ${loadErr.message}`);
  if (!match) return { ok: false, reason: "not_found" };
  if (match.customer_id !== customerId) return { ok: false, reason: "forbidden" };

  const storagePaths = [match.snapshot_path, match.html_snapshot_path].filter(
    (p): p is string => Boolean(p),
  );
  if (storagePaths.length) {
    const { error: storErr } = await supabase.storage
      .from("dart-snapshots")
      .remove(storagePaths);
    if (storErr) {
      // Non-fatal: DB row still must go; orphan files are acceptable vs blocking delete
      console.warn(`deleteMatch storage: ${storErr.message}`);
    }
  }

  const { error: snapErr } = await supabase
    .from("ingest_snapshots")
    .delete()
    .eq("match_id", matchId);
  if (snapErr) throw new Error(`deleteMatch snapshots: ${snapErr.message}`);

  const { error: delErr } = await supabase
    .from("matches")
    .delete()
    .eq("match_id", matchId)
    .eq("customer_id", customerId);
  if (delErr) throw new Error(`deleteMatch: ${delErr.message}`);

  return { ok: true };
}

export type UpdateMatchEditPatch = {
  /** Which N01 slot is "me" after edit */
  playerIndex?: 0 | 1;
  /** Rename players by absolute slot 0/1 (not relative to me) */
  playerNames?: { 0?: string; 1?: string };
};

export type UpdateMatchEditResult =
  | { ok: true; match: N01Match }
  | { ok: false; reason: "not_found" | "forbidden" | "invalid_id" | "invalid_patch" };

/**
 * Edit match identity: swap "me" side and/or rename player names.
 * Does not rewrite legs/visits — only matches row denormalized fields + players JSON.
 */
export async function updateMatchEdit(
  matchId: string,
  customerId: string,
  patch: UpdateMatchEditPatch,
): Promise<UpdateMatchEditResult> {
  if (!MATCH_ID_RE.test(matchId)) return { ok: false, reason: "invalid_id" };

  const hasIndex = patch.playerIndex === 0 || patch.playerIndex === 1;
  const name0 = patch.playerNames?.[0]?.trim();
  const name1 = patch.playerNames?.[1]?.trim();
  const hasNames = Boolean(name0 || name1);
  if (!hasIndex && !hasNames) return { ok: false, reason: "invalid_patch" };
  if (name0 !== undefined && name0.length === 0) return { ok: false, reason: "invalid_patch" };
  if (name1 !== undefined && name1.length === 0) return { ok: false, reason: "invalid_patch" };

  const supabase = getSupabaseAdmin();
  const { data: row, error: loadErr } = await supabase
    .from("matches")
    .select("match_id, customer_id")
    .eq("match_id", matchId)
    .maybeSingle();

  if (loadErr) throw new Error(`updateMatchEdit load: ${loadErr.message}`);
  if (!row) return { ok: false, reason: "not_found" };
  if (row.customer_id !== customerId) return { ok: false, reason: "forbidden" };

  const current = await loadMatchById(matchId);
  if (!current || current.playerIndex === null) {
    return { ok: false, reason: "not_found" };
  }

  const players = current.players.map((p) => ({ ...p })) as [N01Player, N01Player];
  if (name0) players[0] = { ...players[0], name: name0 };
  if (name1) players[1] = { ...players[1], name: name1 };

  const nextIndex = hasIndex ? patch.playerIndex! : current.playerIndex;
  players[0] = { ...players[0], isMe: nextIndex === 0 };
  players[1] = { ...players[1], isMe: nextIndex === 1 };

  const updated: N01Match = {
    ...current,
    players,
    playerIndex: nextIndex,
  };

  const stats = computeMatchStats(updated);
  const oppIdx = nextIndex === 0 ? 1 : 0;

  const { error: updErr } = await supabase
    .from("matches")
    .update({
      player_index: nextIndex,
      opponent_name: opponentName(players, nextIndex),
      player_legs_won: players[nextIndex].winLegs,
      opponent_legs_won: players[oppIdx].winLegs,
      player_average: stats.me.average,
      player_first9: stats.me.first9,
      player_checkout_pct: stats.me.checkoutRate,
      players: players as Json,
      updated_at: new Date().toISOString(),
    })
    .eq("match_id", matchId)
    .eq("customer_id", customerId);

  if (updErr) throw new Error(`updateMatchEdit: ${updErr.message}`);

  return { ok: true, match: updated };
}
